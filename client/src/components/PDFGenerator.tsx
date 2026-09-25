type PDFGeneratorProps = {
    pdfUrl: string;
    unavailable?: boolean;
};

function PDFGenerator({ pdfUrl, unavailable = false }: PDFGeneratorProps) {
    if (!pdfUrl && !unavailable) return null;

    return (
        <section className='pdf-preview' aria-labelledby='guidance-heading'>
            <h3 id='guidance-heading'>Design guidance</h3>
            {pdfUrl ? (
                <object className='pdf-frame' data={pdfUrl} type='application/pdf' aria-label='Design guidance preview'>
                    <p>Your browser cannot preview this PDF.</p>
                </object>
            ) : (
                <p>Design guidance is temporarily unavailable.</p>
            )}
            {pdfUrl ? (
                <a className='pdf-generator' href={pdfUrl} download='HomeDesignInstructions.pdf'>
                    Download design guidance
                </a>
            ) : null}
        </section>
    );
}

export default PDFGenerator;
