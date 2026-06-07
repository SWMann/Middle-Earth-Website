package org.middleearth.anduril.scan;

/**
 * Pure orchestration: given world {@link ScanObservations} plus the
 * {@link ScanContext} and {@link ScanConfig}, produce a {@link ScanResult}.
 * No world access, no DB — so the command path and the HTTP path share the
 * exact same scoring, validation, and gating logic. The world read happens
 * before this ({@link PlotScanner}); persistence happens after
 * ({@link PlotRepository}).
 */
public final class ScanService {
    private final DecorationScorer scorer = new DecorationScorer();
    private final ComponentValidator componentValidator = new ComponentValidator();
    private final FootprintValidator footprintValidator = new FootprintValidator();
    private final TierGate tierGate = new TierGate();

    public ScanResult compute(ScanObservations obs, ScanContext ctx, ScanConfig cfg, Integer popCap) {
        ScanConfig.DistrictSpec spec = cfg.districts().get(ctx.districtType());

        DecorationScorer.Scored scored = scorer.score(obs, cfg, spec);
        ScanResult.ComponentValidation comp = componentValidator.validate(obs, spec, popCap);
        ScanResult.FootprintValidation foot = footprintValidator.validate(obs, spec, ctx.hasLayout());
        TierGate.GateResult gate = tierGate.resolve(scored.total(), ctx.tier(), cfg, spec, comp, foot);

        return new ScanResult(
            ctx, obs, scored.total(), scored.breakdown(),
            comp, foot, gate.reviewStatus(), gate.reviewMode());
    }
}
