package org.middleearth.anduril.link;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.context.CommandContext;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;
import org.middleearth.anduril.Anduril;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ExecutorService;
import java.util.function.Supplier;

import static net.minecraft.server.command.CommandManager.literal;

/**
 * The player-facing half of account linking: {@code /anduril link}.
 *
 * <p>Running it mints a short, single-use code and shows it to the player in
 * chat. They then enter that code on the website (while signed in with Discord)
 * to bind the two accounts. The website side is closed by the bridge's
 * {@code POST /mc-links/redeem} endpoint, which consumes the same code.
 *
 * <p><b>Permissions:</b> unlike the {@code /anduril} scan subcommands (op-only),
 * {@code link} is open to any player — everyone links their own account. The
 * gate is per-subcommand in {@code ScanCommands.register}; this subtree adds no
 * requirement of its own, so it inherits the shared {@code /anduril} root.
 *
 * <p><b>Threading:</b> the command body runs on the server thread. The Neon
 * write is handed to the shared IO executor so it never blocks the tick; the
 * follow-up chat message is marshalled back onto the server thread via
 * {@link MinecraftServer#execute}.
 */
public final class LinkCommands {
    /** How long a freshly issued code stays redeemable. Matches the Phase 1 mock. */
    private static final Duration CODE_TTL = Duration.ofMinutes(15);

    /** Unambiguous alphabet — no 0/O/1/I — so codes are easy to read and type. */
    private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int CODE_LENGTH = 6;

    private final MinecraftServer server;
    private final LinkCodeRepository repository;
    private final ExecutorService ioExecutor;
    private final SecureRandom random = new SecureRandom();

    public LinkCommands(MinecraftServer server, LinkCodeRepository repository,
                        ExecutorService ioExecutor) {
        this.server = server;
        this.repository = repository;
        this.ioExecutor = ioExecutor;
    }

    /**
     * Attach {@code link} to the shared {@code /anduril} command tree. Brigadier
     * merges this into the same root {@code ScanCommands} registers. The live
     * instance is resolved at run time via {@code provider} (it is created once
     * the DB is up, after command-tree construction).
     */
    public static void register(CommandDispatcher<ServerCommandSource> dispatcher,
                                Supplier<LinkCommands> provider) {
        dispatcher.register(literal("anduril")
            .then(literal("link").executes(ctx -> {
                LinkCommands self = provider.get();
                if (self == null) {
                    ctx.getSource().sendError(
                        Text.literal("Andúril is still starting — try again in a moment."));
                    return 0;
                }
                return self.issueCode(ctx);
            })));
        Anduril.LOGGER.info("Andúril link command registered (/anduril link).");
    }

    private int issueCode(CommandContext<ServerCommandSource> ctx) {
        ServerPlayerEntity player = ctx.getSource().getPlayer();
        if (player == null) {
            ctx.getSource().sendError(Text.literal("Run this in-game as a player."));
            return 0;
        }

        var mcUuid = player.getUuid();
        String mcUsername = player.getName().getString();
        String code = generateCode();
        Instant now = Instant.now();
        Instant expiresAt = now.plus(CODE_TTL);

        ctx.getSource().sendFeedback(
            () -> Text.literal("Generating your link code…").formatted(Formatting.GRAY), false);

        ioExecutor.submit(() -> {
            try {
                repository.issue(mcUuid, mcUsername, code, now, expiresAt);
                server.execute(() -> {
                    // The code itself is click-to-copy: clicking it in chat
                    // copies the raw code to the clipboard (Minecraft's
                    // ClickEvent.CopyToClipboard), so the player can paste it
                    // straight into the website instead of retyping it.
                    player.sendMessage(Text.literal("Your link code: ")
                        .formatted(Formatting.GRAY)
                        .append(Text.literal(code)
                            .formatted(Formatting.GOLD, Formatting.BOLD)
                            .styled(s -> s
                                .withClickEvent(new ClickEvent.CopyToClipboard(code))
                                .withHoverEvent(new HoverEvent.ShowText(
                                    Text.literal("Click to copy this code"))))));
                    player.sendMessage(Text.literal(
                        "Enter it on the website's Link page while signed in with Discord. "
                        + "It expires in " + CODE_TTL.toMinutes() + " minutes and can be used once.")
                        .formatted(Formatting.GRAY));
                });
                Anduril.LOGGER.info("Issued link code for {} ({})", mcUsername, mcUuid);
            } catch (Exception e) {
                Anduril.LOGGER.error("Failed to issue link code for {}: {}", mcUuid, e.getMessage(), e);
                server.execute(() -> player.sendMessage(Text.literal(
                    "Couldn't generate a link code right now — please try again shortly.")
                    .formatted(Formatting.RED)));
            }
        });
        return 1;
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }
}
