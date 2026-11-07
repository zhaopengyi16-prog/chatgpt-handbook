// Original, static pixel silhouettes. A source pixel is exactly 2 CSS pixels.
// Keeping the clouds still avoids fractional animation samples and scroll work.
export default function SkyClouds() {
  return <div className="mm-sky-clouds" aria-hidden="true">
    <svg className="mm-cloud mm-cloud-one" width="128" height="64" viewBox="0 0 64 32" focusable="false" shapeRendering="crispEdges">
      <path fill="#b1ced6" d="M5 20h7v-6h9V7h17v5h10v7h10v10H5z"/>
      <path fill="#fffdf6" d="M3 17h7v-6h9V4h17v5h10v7h10v10H3z"/>
      <path fill="#e1e8df" d="M3 23h53v3H3zm40-7h3v7h-3z"/>
      <path fill="#ffffff" d="M20 5h14v2H20zm-9 7h7v2h-7z"/>
    </svg>
    <svg className="mm-cloud mm-cloud-two" width="96" height="48" viewBox="0 0 48 24" focusable="false" shapeRendering="crispEdges">
      <path fill="#b1ced6" d="M3 14h7V8h9V4h13v8h10v10H3z"/>
      <path fill="#fffdf6" d="M1 12h7V6h9V2h13v8h10v10H1z"/>
      <path fill="#e1e8df" d="M1 17h39v3H1zm26-7h3v7h-3z"/>
      <path fill="#ffffff" d="M18 3h10v2H18z"/>
    </svg>
    <svg className="mm-cloud mm-cloud-three" width="80" height="40" viewBox="0 0 40 20" focusable="false" shapeRendering="crispEdges">
      <path fill="#b1ced6" d="M4 11h7V6h13v4h10v8H4z"/>
      <path fill="#fffdf6" d="M2 9h7V4h13v4h10v8H2z"/>
      <path fill="#e1e8df" d="M2 14h30v2H2z"/>
      <path fill="#ffffff" d="M10 5h10v2H10z"/>
    </svg>
  </div>;
}
