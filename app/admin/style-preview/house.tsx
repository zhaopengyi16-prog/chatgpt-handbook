// Original integer-grid artwork. The 16×16 A/B wood and shingle tiles
// alternate in 32×32 supertiles, enlarged exactly 2× inside this SVG.
export default function HouseArt() {
  const roof = 'M126 194V176H142V164H158V152H174V140H190V128H206V116H222V104H238V92H254V80H270V68H292V80H308V92H324V104H340V116H356V128H372V140H388V152H404V164H420V176H436V194Z';
  const face = 'M130 190V180H146V168H162V156H178V144H194V132H210V120H226V108H242V96H258V84H274V72H288V84H304V96H320V108H336V120H352V132H368V144H384V156H400V168H416V180H432V190Z';
  return (<svg className="mm-house-art" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="560" height="420" viewBox="0 0 560 420" fill="none" shapeRendering="crispEdges" style={{imageRendering: 'pixelated'}}>
    <defs>
      <g id="mm-house-plank-a">
        <path fill="#b9824a" d="M0 0h16v16H0z"/><path fill="#d5a46c" d="M0 8h16v7H0z"/>
        <path fill="#ebc58f" d="M0 0h16v1H0zm0 8h16v1H0zm2-5h5v1H2zm9 7h3v1h-3z"/>
        <path fill="#8e5e33" d="M0 7h16v1H0zm0 8h16v1H0zm3-11h3v1H3zm6 7h4v1H9zm-2-8h1v1H7z"/>
      </g>
      <g id="mm-house-plank-b">
        <path fill="#d5a46c" d="M0 0h16v16H0z"/><path fill="#b9824a" d="M0 8h16v7H0z"/>
        <path fill="#ebc58f" d="M0 0h16v1H0zm0 8h16v1H0zm8-5h5v1H8zm-6 8h5v1H2z"/>
        <path fill="#8e5e33" d="M0 7h16v1H0zm0 8h16v1H0zm2-12h3v1H2zm6 8h5v1H8zm-4 1h3v1H4z"/>
      </g>
      <pattern id="mm-house-wall" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
        <use href="#mm-house-plank-a"/><use href="#mm-house-plank-b" x="16"/><use href="#mm-house-plank-b" y="16"/><use href="#mm-house-plank-a" x="16" y="16"/>
      </pattern>
      <g id="mm-house-shingle-a">
        <path fill="#d9622b" d="M0 0h16v16H0z"/>
        <path fill="#ed8b43" d="M0 0h16v1H0zm0 8h16v1H0zm2-5h3v1H2zm7 8h3v1H9z"/>
        <path fill="#a9411d" d="M0 6h16v2H0zm0 8h16v2H0zm7-13h1v5H7zm-4 8h1v5H3zm8 0h1v5h-1z"/>
        <path fill="#f8c878" d="M0 0h4v1H0zm8 8h3v1H8z"/>
      </g>
      <g id="mm-house-shingle-b">
        <path fill="#d9622b" d="M0 0h16v16H0z"/><path fill="#ed8b43" d="M8 1h7v5H8zM0 9h3v5H0z"/>
        <path fill="#a9411d" d="M0 6h16v2H0zm0 8h16v2H0zm7-13h1v5H7zm-4 8h1v5H3zm8 0h1v5h-1z"/>
        <path fill="#ed8b43" d="M0 0h16v1H0zm0 8h16v1H0z"/><path fill="#f8c878" d="M8 0h3v1H8zm-6 8h4v1H2z"/>
      </g>
      <pattern id="mm-house-roof" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
        <use href="#mm-house-shingle-a"/><use href="#mm-house-shingle-b" x="16"/><use href="#mm-house-shingle-b" y="16"/><use href="#mm-house-shingle-a" x="16" y="16"/>
      </pattern>
      <pattern id="mm-house-brick" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
        <path fill="#8d939b" d="M0 0h16v16H0z"/><path fill="#abb1b8" d="M0 0h16v1H0zm0 8h16v1H0zm1-6h3v1H1zm9 8h4v1h-4z"/>
        <path fill="#6d747d" d="M0 7h16v1H0zm0 8h16v1H0zm7-14h1v6H7zm-4 8h1v6H3zm8 0h1v6h-1z"/>
      </pattern>
      <g id="mm-house-window">
        <path fill="#1f2a1c" d="M4 4h68v74H4zM0 0h68v74H0z"/><path fill="#8e5e33" d="M3 3h62v68H3z"/>
        <path fill="#ebc58f" d="M3 3h62v2H5v66H3z"/><path fill="#dba944" d="M10 10h48v48H10z"/>
        <path fill="#f2c94c" d="M10 10h44v44H10z"/><path fill="#fff0b0" d="M10 10h44v8H18v36h-8z"/>
        <path fill="#8e5e33" d="M32 10h4v48h-4zM10 32h48v4H10z"/><path fill="#b9824a" d="M32 10h1v48h-1zM10 32h48v1H10z"/>
        <path fill="#1f2a1c" d="M-4 69h80v10H-4z"/><path fill="#b9824a" d="M-4 69h76v6H-4z"/><path fill="#ebc58f" d="M-4 69h76v2H-4z"/>
      </g>
    </defs>
    {/* Horizontal boards and two individually drawn knots. */}
    <path fill="#1f2a1c" d="M157 193h274v187H157zM151 187h276v190H151z"/><path fill="url(#mm-house-wall)" d="M154 190h270v184H154z"/>
    <path fill="#ebc58f" d="M154 190h270v2H156v182h-2z"/><path fill="#8e5e33" d="M420 192h4v182H156v-4h264z"/>
    <path fill="#8e5e33" d="M270 220h8v2h4v4h-4v2h-8v-2h-4v-4h4zm-94 115h6v2h4v4h-4v2h-6v-2h-4v-4h4z"/>
    <path fill="#ebc58f" d="M270 222h8v2h-8zm-94 115h6v2h-6z"/><path fill="#1f2a1c" d="M272 224h4v2h-4zm-94 115h2v2h-2z"/>
    {/* Staggered shingles, projecting eaves and a two-pixel wall shadow. */}
    <path d={roof} transform="translate(5 5)" fill="#1f2a1c"/><path d={roof} fill="#1f2a1c"/><path d={face} fill="url(#mm-house-roof)"/>
    <path fill="#ed8b43" d="M130 188h302v2H130z"/><path fill="#8e5e33" d="M154 194h270v2H154z"/>
    {/* Brick courses, cap and four quiet smoke pixels. */}
    <path fill="#1f2a1c" d="M365 108h36v73h-36zM360 104h36v73h-36zM356 98h44v12h-44z"/><path fill="url(#mm-house-brick)" d="M363 108h30v66h-30z"/>
    <path fill="#d0d4da" d="M363 108h2v66h-2zM359 101h38v3h-38z"/><path fill="#6d747d" d="M388 108h5v66h-5zM359 104h38v3h-38z"/>
    <path fill="#e9f0f4" d="M373 86h4v4h-4zm7-12h5v5h-5zm-6-12h6v6h-6zm7-11h4v4h-4z"/>
    <use href="#mm-house-window" x="176" y="215"/><use href="#mm-house-window" x="326" y="215"/>
    <path fill="#8e5e33" d="M191 298h36v4h-36zm4 4h28v15h-28z"/><path fill="#d9622b" d="M195 302h25v12h-25z"/><path fill="#ed8b43" d="M195 302h25v2h-23v10h-2z"/>
    <path fill="#477f2c" d="M207 288h3v14h-3zm-6 4h6v3h-6zm9-4h6v3h-6zM347 289h3v9h-3zm-6 4h6v3h-6zm9-5h5v3h-5z"/>
    <path fill="#fffdf6" d="M204 285h8v5h-8z"/><path fill="#f2c94c" d="M207 286h2v2h-2z"/>
    {/* Inset door, deep frame and upper-left highlights. */}
    <path fill="#1f2a1c" d="M254 279h70v98h-70z"/><path fill="#8e5e33" d="M257 282h64v92h-64z"/>
    <path fill="#ebc58f" d="M257 282h64v3h-61v89h-3z"/><path fill="url(#mm-house-wall)" d="M264 289h50v82h-50z"/>
    <path fill="#8e5e33" d="M310 289h4v82h-4zM264 367h50v4h-50z"/><path fill="#1f2a1c" d="M300 328h7v7h-7z"/><path fill="#f2c94c" d="M300 328h5v5h-5z"/><path fill="#fff0b0" d="M300 328h5v1h-4v4h-1z"/>
    {/* Blades overlap the building; the steps remain clear. */}
    <path fill="#694020" d="M143 374h103v10H143zm184 0h107v10H327z"/>
    <path fill="#477f2c" d="M140 371h7v-6h4v6h7v-12h4v8h5v5h8v-7h4v5h8v-9h4v8h6v4h13v-8h4v7h12v-5h4v5h16v8H140zm187 0h8v-8h4v7h6v-13h4v10h5v5h9v-9h4v8h12v-6h4v5h12v-9h4v9h12v-6h4v8h11v-5h4v5h8v8H327z"/>
    <path fill="#5fa83a" d="M147 371h8v3h8v-7h3v8h14v-5h4v6h25v-4h4v5h29v3h-95zm188 1h8v3h8v-8h3v9h17v-5h3v6h30v-7h3v8h22v2h-94z"/>
    <path fill="#9bd76a" d="M159 360h2v7h-2zm30 3h2v6h-2zm158-4h2v8h-2zm48 4h2v7h-2z"/>
    <path fill="#1f2a1c" d="M246 374h82v13h-82z"/><path fill="#8d939b" d="M249 377h76v7h-76z"/><path fill="#d0d4da" d="M249 377h76v2h-76z"/>
    {/* Small original material blocks retain the existing composition. */}
    <path fill="#1f2a1c" d="M59 320h64v64H59zM54 315h64v64H54z"/><path fill="#8b5a2b" d="M57 332h58v44H57z"/>
    <path fill="#ae7843" d="M61 342h8v4h-8zm22-3h12v6H83zm15 17h9v5h-9zm-31 7h10v5H67z"/><path fill="#6d747d" d="M73 349h6v4h-6zm24-5h4v3h-4z"/>
    <path fill="#5fa83a" d="M57 318h58v15h-5v5h-6v-3H94v5h-6v-7H75v4h-5v-4H57z"/><path fill="#9bd76a" d="M57 318h58v2H59v11h-2zm6 7h4v2h-4zm21-3h5v3h-5z"/>
    <path fill="#477f2c" d="M108 320h7v13h-5v5h-2zm-32 7h4v2h-4zm18-4h3v3h-3z"/>
    <path fill="#1f2a1c" d="M464 330h52v54h-52zM459 325h52v54H459z"/><path fill="#8a5cc4" d="M462 328h46v48H462z"/>
    <path fill="#ae86df" d="M462 328h46v2h-44v44h-2zM473 336h18v4h-18zm-4 4h4v20h-4z"/><path fill="#63418f" d="M503 330h5v46h-44v-4h39zM491 340h6v20h-6zm-18 20h18v6h-18z"/>
    <path fill="#d1b5ec" d="M475 339h4v4h-4z"/><path fill="#1f2a1c" d="M218 395h146v19H218zM213 390h146v19H213z"/><path fill="#fffdf6" d="M216 393h140v13H216z"/><path fill="#dcd7c9" d="M219 402h134v3H219z"/>
  </svg>);
}
