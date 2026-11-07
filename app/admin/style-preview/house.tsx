// Original geometry and textures for the decorative house.
export default function HouseArt() {
  return (<svg className="mm-house-art" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="560" height="420" viewBox="0 0 560 420" fill="none" shapeRendering="crispEdges">
  <defs>
    <pattern id="mm-house-wall" width="16" height="16" patternUnits="userSpaceOnUse">
      <path fill="#e3cd84" d="M0 0h16v16H0z"/>
      <path fill="#fffdf6" fillOpacity=".16" d="M0 0h8v8H0zm8 8h8v8H8z"/>
      <path fill="#8b5a2b" fillOpacity=".1" d="M0 12h16v4H0z"/>
    </pattern>
    <pattern id="mm-house-roof" width="24" height="16" patternUnits="userSpaceOnUse">
      <path fill="#d9622b" d="M0 0h24v16H0z"/>
      <path fill="#f2c94c" fillOpacity=".2" d="M0 0h12v8H0zm12 8h12v8H12z"/>
      <path fill="#1f2a1c" fillOpacity=".12" d="M0 12h24v4H0zM20 0h4v16h-4z"/>
    </pattern>
    <pattern id="mm-house-grass" width="16" height="16" patternUnits="userSpaceOnUse">
      <path fill="#5fa83a" d="M0 0h16v16H0z"/>
      <path fill="#fffdf6" fillOpacity=".16" d="M0 0h8v8H0zm8 8h8v8H8z"/>
      <path fill="#1f2a1c" fillOpacity=".08" d="M12 0h4v16h-4z"/>
    </pattern>
    <pattern id="mm-house-gem" width="16" height="16" patternUnits="userSpaceOnUse">
      <path fill="#8a5cc4" d="M0 0h16v16H0z"/>
      <path fill="#fffdf6" fillOpacity=".18" d="M3 3h4v4h4v4H3z"/>
    </pattern>
    <pattern id="mm-house-wood" width="20" height="40" patternUnits="userSpaceOnUse">
      <path fill="#b9824a" d="M0 0h20v40H0z"/>
      <path fill="#fffdf6" fillOpacity=".12" d="M0 0h4v40H0z"/>
      <path fill="#1f2a1c" fillOpacity=".18" d="M16 0h2v40h-2z"/>
    </pattern>
  </defs>

  {/* Clouds use stepped silhouettes, not borrowed sprite artwork. */}
  <path d="M51 48h24V32h48v16h32v28H51z" fill="#1f2a1c"/>
  <path d="M46 43h24V27h48v16h32v28H46z" fill="#fffdf6" stroke="#1f2a1c" strokeWidth="3"/>
  <path d="M50 63h96v5H50z" fill="#dcd7c9"/>
  <path d="M402 77h20V61h32v16h40v24h-92z" fill="#1f2a1c"/>
  <path d="M397 72h20V56h32v16h40v24h-92z" fill="#fffdf6" stroke="#1f2a1c" strokeWidth="3"/>
  <path d="M401 88h84v5h-84z" fill="#dcd7c9"/>

  {/* Five-pixel hard shadows and inset edges give each material depth. */}
  <path fill="#1f2a1c" d="M159 195h270v183H159z"/>
  <path fill="url(#mm-house-wall)" stroke="#1f2a1c" strokeWidth="3" d="M154 190h270v183H154z"/>
  <path d="M158 194h262v8H166v163h-8z" fill="#fffdf6" fillOpacity=".35"/>
  <path d="M414 202h7v168H166v-8h248z" fill="#8b5a2b" fillOpacity=".42"/>

  <path d="M134 195v-12h16v-12h16v-12h16v-12h16v-12h16v-12h16v-12h16V99h16V87h16V75h16v12h16v12h16v12h16v12h16v12h16v12h16v12h16v12h16v12h16v12z" fill="#1f2a1c"/>
  <path d="M129 190v-12h16v-12h16v-12h16v-12h16v-12h16v-12h16v-12h16V94h16V82h16V70h16v12h16v12h16v12h16v12h16v12h16v12h16v12h16v12h16v12h16v12z" fill="url(#mm-house-roof)" stroke="#1f2a1c" strokeWidth="3"/>
  <path d="M145 181h272v6H145z" fill="#1f2a1c" fillOpacity=".25"/>

  <path fill="#1f2a1c" d="M365 135h36v72h-36z"/>
  <path fill="#8d939b" stroke="#1f2a1c" strokeWidth="3" d="M360 130h36v72h-36z"/>
  <path fill="#e9f0f4" fillOpacity=".58" d="M364 134h28v5h-23v59h-5z"/>
  <path fill="#1f2a1c" fillOpacity=".25" d="M386 140h7v59h-7z"/>
  <path fill="#1f2a1c" fillOpacity=".22" d="M369 157h17v3h-17zm0 22h17v3h-17z"/>

  <path fill="#1f2a1c" d="M185 223h62v66h-62zm150 0h62v66h-62z"/>
  <path fill="#3d82c6" stroke="#1f2a1c" strokeWidth="3" d="M180 218h62v66h-62zm150 0h62v66h-62z"/>
  <path fill="#e9f0f4" fillOpacity=".65" d="M184 222h54v5h-49v53h-5zm150 0h54v5h-49v53h-5z"/>
  <path fill="#fffdf6" fillOpacity=".15" d="M200 227h10v52h-10zm150 0h10v52h-10z"/>
  <path stroke="#1f2a1c" strokeWidth="3" d="M211 226v53m150-53v53"/>
  <path fill="#1f2a1c" fillOpacity=".2" d="M233 227h6v54h-6zm150 0h6v54h-6z"/>

  <path fill="#1f2a1c" d="M260 286h64v92h-64z"/>
  <path fill="url(#mm-house-wood)" stroke="#1f2a1c" strokeWidth="3" d="M255 281h64v92h-64z"/>
  <path d="M259 285h56v6h-50v79h-6z" fill="#fffdf6" fillOpacity=".3"/>
  <path d="M309 291h7v79h-7z" fill="#1f2a1c" fillOpacity=".22"/>
  <path fill="#1f2a1c" d="M298 327h7v7h-7z"/>
  <path fill="#f2c94c" d="M298 327h5v5h-5z"/>
  <path fill="#8d939b" stroke="#1f2a1c" strokeWidth="3" d="M247 373h80v12h-80z"/>
  <path fill="#e9f0f4" fillOpacity=".45" d="M251 377h72v3h-72z"/>

  <path fill="#1f2a1c" d="M59 320h64v64H59z"/>
  <path fill="url(#mm-house-grass)" stroke="#1f2a1c" strokeWidth="3" d="M54 315h64v64H54z"/>
  <path d="M58 319h56v6H64v50h-6z" fill="#fffdf6" fillOpacity=".32"/>
  <path d="M108 325h7v51H64v-7h44z" fill="#1f2a1c" fillOpacity=".28"/>

  <path fill="#1f2a1c" d="M464 330h52v54h-52z"/>
  <path fill="url(#mm-house-gem)" stroke="#1f2a1c" strokeWidth="3" d="M459 325h52v54h-52z"/>
  <path d="M463 329h44v6h-38v40h-6z" fill="#fffdf6" fillOpacity=".32"/>
  <path d="M501 335h7v41h-39v-7h32z" fill="#1f2a1c" fillOpacity=".28"/>

  <path fill="#1f2a1c" d="M218 395h146v19H218z"/>
  <path fill="#fffdf6" stroke="#1f2a1c" strokeWidth="3" d="M213 390h146v19H213z"/>
  <path fill="#1f2a1c" fillOpacity=".18" d="M219 402h134v3H219z"/>
</svg>);
}
