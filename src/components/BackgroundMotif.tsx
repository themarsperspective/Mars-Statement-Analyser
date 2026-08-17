// Hand-drawn space line-art (public/space-bg.png), tiled at very low opacity
// across the full page height. A deliberate but restrained texture: content
// cards sit on solid/near-solid backgrounds above it, so it only ever reads
// through the page's negative space, never competing with card text.
export default function BackgroundMotif() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 opacity-[0.28]"
      style={{
        backgroundImage: "url(/space-bg.png)",
        backgroundRepeat: "repeat",
        // Percentage (relative to this element's own box, i.e. the viewport,
        // since it's fixed inset-0) rather than a fixed px size — that keeps
        // the repeat count roughly constant across screen widths instead of
        // tiling more densely as the viewport gets wider. ~40% width gives
        // about 2.5 horizontal repeats on any desktop screen.
        backgroundSize: "40% auto",
        backgroundPosition: "top center",
      }}
      aria-hidden="true"
    />
  );
}
