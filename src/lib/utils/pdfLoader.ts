export async function ensureJsPDF() {
    if (typeof window === 'undefined') return null;
    const w: any = window;
    if (w.jsPDF) return w.jsPDF;

    try {
        const mod = await import('jspdf');
        const jsPDF = mod.jsPDF || mod.default || mod;
        // expose globals for legacy code expecting window.jsPDF or window.jspdf
        w.jsPDF = jsPDF;
        w.jspdf = mod;
        return jsPDF;
    } catch (err) {
        console.error('Failed to load jsPDF:', err);
        return null;
    }
}
