/**
 * Captures a DOM element with html2canvas and downloads it as a multi-page
 * A4 landscape PDF. Used on mobile instead of window.print().
 */
export async function generateReportPDF(
    element: HTMLElement,
    filename: string = 'manifest-report'
): Promise<void> {
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
    ]);

    // Double rAF: ensures the browser has fully painted the element before capture
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    // Extra paint settle for complex DOM (tables, large fonts)
    await new Promise<void>((resolve) => setTimeout(resolve, 150));

    const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        // Let html2canvas measure dimensions itself — avoid scrollWidth/windowWidth
        // overrides that can produce blank output on some mobile browsers
    });

    if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('html2canvas produced an empty canvas — element may not be rendered');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.88);
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // A4 landscape
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageW = 297; // mm
    const pageH = 210; // mm

    const pxPerMm = canvasW / pageW;
    const pageHpx = pageH * pxPerMm;
    const totalImgH = canvasH / pxPerMm;

    let yPx = 0;
    let page = 0;

    while (yPx < canvasH) {
        if (page > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, -(yPx / pxPerMm), pageW, totalImgH);
        yPx += pageHpx;
        page++;
    }

    pdf.save(`${filename}.pdf`);
}
