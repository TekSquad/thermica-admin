const LINK = "font-bold underline-offset-2 hover:underline";

export default function Credit({ className = "", dark = false }) {
    const tone = dark ? "text-slate-500" : "text-slate-400";
    const strong = dark ? "text-slate-300" : "text-slate-600";
    return (
        <p className={`flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium ${tone} ${className}`}>
            <span>Crafted by</span>
            <a href="https://teksquad.tech" target="_blank" rel="noopener noreferrer" className={`${LINK} ${strong}`}>
                TekSquad
            </a>
            <span aria-hidden="true">·</span>
            <a href="https://teksquad.tech" target="_blank" rel="noopener noreferrer" className={LINK}>
                teksquad.tech
            </a>
        </p>
    );
}