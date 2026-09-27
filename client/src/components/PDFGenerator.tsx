import { FiDownload, FiExternalLink } from 'react-icons/fi';
type PDFGeneratorProps = { pdfUrl: string; unavailable?: boolean };
function PDFGenerator({ pdfUrl, unavailable = false }: PDFGeneratorProps) {
    if (!pdfUrl && !unavailable) return null;
    return (
        <section className='pdf-preview' aria-labelledby='guidance-heading'>
            <h3 id='guidance-heading'>Design guidance</h3>
            {pdfUrl ? (
                <>
                    <div className='blueprint-files'>
                        <a className='tool-btn' href={pdfUrl} download='HomeDesignInstructions.pdf'>
                            <FiDownload aria-hidden='true' /> Download PDF
                        </a>
                        <a
                            className='tool-btn'
                            href={pdfUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            <FiExternalLink aria-hidden='true' /> Open PDF
                        </a>
                    </div>
                    <details className='pdf-preview-disclosure'>
                        <summary>Preview PDF</summary>
                        <object
                            className='pdf-frame'
                            data={pdfUrl}
                            type='application/pdf'
                            aria-label='Design guidance preview'
                        >
                            <p>
                                Your browser cannot preview this PDF.{' '}
                                <a href={pdfUrl} target='_blank' rel='noopener noreferrer'>
                                    Open design guidance
                                </a>{' '}
                                or use Download PDF above.
                            </p>
                        </object>
                    </details>
                </>
            ) : (
                <p>Design guidance is temporarily unavailable.</p>
            )}
        </section>
    );
}
export default PDFGenerator;
