import{j as t}from"./motion-vendor-CR_P2IaT.js";import{V as s}from"./index-CwabVGgh.js";const n=({status:r,size:o="md",showIcon:a=!0})=>{const d={sm:"text-xs px-2 py-0.5 gap-1.5",md:"text-xs px-2.5 py-1 gap-2",lg:"text-sm px-3.5 py-1.5 gap-2.5 font-medium"}[o],e={verified:{bg:"bg-emerald-500/10",border:"border-emerald-500/30",text:"text-emerald-400",glow:"shadow-[0_0_12px_rgba(16,185,129,0.25)]",dot:"bg-emerald-400",icon:"✓",title:"Verified: All assertion tests and validation criteria passed cleanly."},failed:{bg:"bg-red-500/10",border:"border-red-500/30",text:"text-red-400",glow:"shadow-[0_0_12px_rgba(239,68,68,0.25)]",dot:"bg-red-400",icon:"✗",title:"Failed: At least one automated regression or boundary test failed."},not_verified:{bg:"bg-amber-500/10",border:"border-amber-500/30",text:"text-amber-400",glow:"shadow-[0_0_12px_rgba(245,158,11,0.25)]",dot:"bg-amber-400",icon:"⚠",title:"Not Verified: No tests collected (exit 5), timeout, or environment error."}}[r];return t.jsxs("span",{title:e.title,className:`
        inline-flex items-center rounded-full border
        font-mono uppercase tracking-wider
        ${e.bg}
        ${e.border}
        ${e.text}
        ${e.glow}
        ${d}
      `,children:[t.jsx("span",{className:`w-1.5 h-1.5 rounded-full ${e.dot} animate-pulse`}),a&&t.jsx("span",{children:e.icon}),t.jsx("span",{children:s[r]})]})};export{n as S};
//# sourceMappingURL=StatusBadge-CArXEexq.js.map
