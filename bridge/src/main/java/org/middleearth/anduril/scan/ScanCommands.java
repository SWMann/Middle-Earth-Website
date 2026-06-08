package org.middleearth.anduril.scan;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.StringArgumentType;
import com.mojang.brigadier.context.CommandContext;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import net.minecraft.util.math.BlockPos;
import org.middleearth.anduril.Anduril;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;

import static net.minecraft.server.command.CommandManager.argument;
import static net.minecraft.server.command.CommandManager.literal;

/**
 * The in-game entry point: {@code /anduril pos1|pos2|plot|clear} to mark a
 * two-corner selection, and {@code /anduril scan <districtType> [faction]
 * [tier]} to score and validate it.
 *
 * <p><b>Threading:</b> the command body runs on the server thread, so it reads
 * the world directly ({@link PlotScanner#observe}) into plain
 * {@link ScanObservations}, computes the {@link ScanResult} (pure), gives the
 * player immediate feedback, then hands persistence to the IO executor — the
 * Neon write never blocks the tick. The follow-up "saved" message is marshalled
 * back onto the server thread via {@link MinecraftServer#execute}.
 */
public final class ScanCommands {
    private final MinecraftServer server;
    private final ConfigReader configReader;
    private final ScanService scanService;
    private final PlotScanner plotScanner;
    private final PlotRepository plotRepository;
    private final ExecutorService ioExecutor;

    // Per-player two-corner selection (block coords).
    private final Map<UUID, BlockPos> corner1 = new ConcurrentHashMap<>();
    private final Map<UUID, BlockPos> corner2 = new ConcurrentHashMap<>();

    public ScanCommands(MinecraftServer server, ConfigReader configReader, ScanService scanService,
                        PlotScanner plotScanner, PlotRepository plotRepository,
                        ExecutorService ioExecutor) {
        this.server = server;
        this.configReader = configReader;
        this.scanService = scanService;
        this.plotScanner = plotScanner;
        this.plotRepository = plotRepository;
        this.ioExecutor = ioExecutor;
    }

    public void register(CommandDispatcher<ServerCommandSource> dispatcher) {
        dispatcher.register(literal("anduril")
            .requires(src -> src.hasPermissionLevel(2))
            .then(literal("pos1").executes(ctx -> setCorner(ctx, 1)))
            .then(literal("pos2").executes(ctx -> setCorner(ctx, 2)))
            .then(literal("plot").executes(this::showSelection))
            .then(literal("clear").executes(this::clearSelection))
            .then(literal("scan")
                .then(argument("districtType", StringArgumentType.word())
                    .executes(ctx -> doScan(ctx, null, null))
                    .then(argument("faction", StringArgumentType.word())
                        .executes(ctx -> doScan(ctx, StringArgumentType.getString(ctx, "faction"), null))
                        .then(argument("tier", StringArgumentType.word())
                            .executes(ctx -> doScan(ctx,
                                StringArgumentType.getString(ctx, "faction"),
                                StringArgumentType.getString(ctx, "tier"))))))));
        Anduril.LOGGER.info("Andúril scan commands registered (/anduril).");
    }

    private int setCorner(CommandContext<ServerCommandSource> ctx, int which) {
        ServerPlayerEntity player = ctx.getSource().getPlayer();
        if (player == null) {
            ctx.getSource().sendError(Text.literal("Run this as a player."));
            return 0;
        }
        BlockPos pos = player.getBlockPos();
        (which == 1 ? corner1 : corner2).put(player.getUuid(), pos);
        ctx.getSource().sendFeedback(() -> Text.literal(
            "Corner " + which + " set to " + fmt(pos)).formatted(Formatting.AQUA), false);
        return 1;
    }

    private int clearSelection(CommandContext<ServerCommandSource> ctx) {
        ServerPlayerEntity player = ctx.getSource().getPlayer();
        if (player == null) return 0;
        corner1.remove(player.getUuid());
        corner2.remove(player.getUuid());
        ctx.getSource().sendFeedback(() -> Text.literal("Selection cleared.").formatted(Formatting.GRAY), false);
        return 1;
    }

    private int showSelection(CommandContext<ServerCommandSource> ctx) {
        ServerPlayerEntity player = ctx.getSource().getPlayer();
        if (player == null) return 0;
        BlockPos a = corner1.get(player.getUuid());
        BlockPos b = corner2.get(player.getUuid());
        if (a == null || b == null) {
            ctx.getSource().sendError(Text.literal("Set both corners first: /anduril pos1 and /anduril pos2."));
            return 0;
        }
        int w = Math.abs(a.getX() - b.getX()) + 1;
        int h = Math.abs(a.getY() - b.getY()) + 1;
        int d = Math.abs(a.getZ() - b.getZ()) + 1;
        ctx.getSource().sendFeedback(() -> Text.literal(
            "Plot " + fmt(a) + " → " + fmt(b) + "  (" + w + "×" + h + "×" + d + ", footprint " + (w * d) + ")")
            .formatted(Formatting.AQUA), false);
        return 1;
    }

    private int doScan(CommandContext<ServerCommandSource> ctx, String factionId, String tier) {
        ServerCommandSource source = ctx.getSource();
        ServerPlayerEntity player = source.getPlayer();
        if (player == null) {
            source.sendError(Text.literal("Run this as a player."));
            return 0;
        }
        UUID uuid = player.getUuid();
        BlockPos a = corner1.get(uuid);
        BlockPos b = corner2.get(uuid);
        if (a == null || b == null) {
            source.sendError(Text.literal("Set both corners first: /anduril pos1 and /anduril pos2."));
            return 0;
        }

        String districtType = StringArgumentType.getString(ctx, "districtType");
        ScanConfig config = configReader.get();
        if (!config.districts().containsKey(districtType)) {
            source.sendError(Text.literal("Unknown district type: " + districtType));
            return 0;
        }
        if (factionId != null && !config.factionCulture().containsKey(factionId)) {
            // Not fatal — theme just won't be scored — but warn so it's not a silent typo.
            source.sendFeedback(() -> Text.literal(
                "Note: faction '" + factionId + "' has no culture mapping; theme not scored.")
                .formatted(Formatting.GRAY), false);
        }
        String cultureId = factionId != null ? config.factionCulture().get(factionId) : null;
        var cultureBlocks = cultureId != null ? config.culturePalettes().get(cultureId) : null;

        ServerWorld world = source.getWorld();
        int bottom = world.getBottomY();
        int top = world.getBottomY() + world.getHeight() - 1;
        int minX = Math.min(a.getX(), b.getX());
        int maxX = Math.max(a.getX(), b.getX());
        int minZ = Math.min(a.getZ(), b.getZ());
        int maxZ = Math.max(a.getZ(), b.getZ());
        int minY = Math.max(bottom, Math.min(a.getY(), b.getY()));
        int maxY = Math.min(top, Math.max(a.getY(), b.getY()));

        ScanObservations obs;
        try {
            obs = plotScanner.observe(world, minX, minY, minZ, maxX, maxY, maxZ,
                config, new ComponentDetector(config), cultureBlocks);
        } catch (IllegalArgumentException e) {
            source.sendError(Text.literal(e.getMessage()));
            return 0;
        }

        String scannedBy = player.getGameProfile().getName();
        ScanContext sctx = ScanContext.command(districtType, factionId, cultureId, tier, scannedBy);
        // Command/box path: no layout, so building count can't be verified (bv = null).
        ScanResult result = scanService.compute(obs, sctx, config, null, null);

        sendResultFeedback(source, result);

        // Persist off-thread; report the saved id back on the server thread.
        ioExecutor.submit(() -> {
            try {
                PlotRepository.PersistResult pr = plotRepository.persist(result);
                server.execute(() -> source.sendFeedback(() -> Text.literal(
                    "Saved as plot #" + pr.plotId() + " (" + result.reviewStatus() + ").")
                    .formatted(Formatting.GREEN), false));
            } catch (Exception e) {
                Anduril.LOGGER.error("Failed to persist scan: {}", e.getMessage(), e);
                server.execute(() -> source.sendError(Text.literal(
                    "Scan computed but failed to save: " + e.getMessage())));
            }
        });
        return 1;
    }

    private void sendResultFeedback(ServerCommandSource source, ScanResult r) {
        Formatting statusColor = switch (r.reviewStatus()) {
            case TierGate.AUTO_APPROVED -> Formatting.GREEN;
            case TierGate.PENDING_SPOT -> Formatting.YELLOW;
            default -> Formatting.GOLD;
        };
        source.sendFeedback(() -> Text.literal(
            "Scan " + r.ctx().districtType() + " — score ")
            .formatted(Formatting.WHITE)
            .append(Text.literal(r.decorationScore() + "/100").formatted(Formatting.AQUA))
            .append(Text.literal("  → " + r.reviewStatus()).formatted(statusColor)), false);

        ScanResult.ComponentValidation cv = r.componentValidation();
        long compOk = cv.required().stream().filter(ScanResult.ReqComponentResult::ok).count();
        source.sendFeedback(() -> Text.literal(String.format(
            "Components %d/%d%s · Footprint %s (%d blocks, %s) · Buildings %s",
            compOk, cv.required().size(), cv.uncertain() ? " (some uncertain)" : "",
            r.footprintValidation().pass() ? "ok" : "off",
            r.footprintValidation().areaBlocks(),
            r.footprintValidation().heightBlocks() + "h",
            r.footprintValidation().buildingsVerified() ? "verified" : "unverified→review"))
            .formatted(Formatting.GRAY), false);

        source.sendFeedback(() -> Text.literal(breakdownLine(r.criteriaBreakdown()))
            .formatted(Formatting.DARK_GRAY), false);
    }

    private static String breakdownLine(Map<String, Integer> b) {
        StringBuilder sb = new StringBuilder();
        appendCrit(sb, b, "block_variety", "variety");
        appendCrit(sb, b, "light_density", "light");
        appendCrit(sb, b, "vertical_interest", "vert");
        appendCrit(sb, b, "decoration_density", "decor");
        appendCrit(sb, b, "theme_adherence", "theme");
        appendCrit(sb, b, "furnishing_completeness", "furnish");
        appendCrit(sb, b, "scale_appropriateness", "scale");
        appendCrit(sb, b, "material_quality", "mat");
        return sb.toString();
    }

    private static void appendCrit(StringBuilder sb, Map<String, Integer> b, String id, String label) {
        Integer v = b.get(id);
        if (v == null) return;
        if (sb.length() > 0) sb.append(" · ");
        sb.append(label).append(' ').append(v);
    }

    private static String fmt(BlockPos p) {
        return "(" + p.getX() + ", " + p.getY() + ", " + p.getZ() + ")";
    }
}
