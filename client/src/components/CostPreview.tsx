import type { CostSummary } from '../api/homeDesign';

type CostPreviewProps = {
    cost: CostSummary | null;
    savings: { title: string; reason: string }[];
};

function money(value?: number) {
    if (typeof value !== 'number') return '—';
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(value);
}

function confidenceLabel(value: string) {
    if (value === 'verified-listed') return 'Current listed price';
    if (value === 'listed-undated') return 'Listed price, date not confirmed';
    if (value === 'estimated') return 'Estimated price';
    return 'Contact supplier for price';
}

function CostPreview({ cost, savings }: CostPreviewProps) {
    if (!cost) return null;
    return (
        <section className='cost-preview' aria-labelledby='cost-heading'>
            <h3 id='cost-heading'>Estimated project cost</h3>
            <p>Approximate planning estimate. Not a final construction cost.</p>
            <div className='cost-table-wrap'>
                <table>
                    <caption className='visually-hidden'>Material quantities, prices, and subtotals</caption>
                    <thead>
                        <tr>
                            <th scope='col'>Material</th>
                            <th scope='col'>Quantity</th>
                            <th scope='col'>Unit</th>
                            <th scope='col'>Supplier</th>
                            <th scope='col'>Unit price</th>
                            <th scope='col'>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cost.lines.map((line) => (
                            <tr key={`${line.category}-${line.materialType}-${line.description}`}>
                                <th scope='row'>
                                    {line.description}
                                    <span className='cost-confidence'>{confidenceLabel(line.priceConfidence)}</span>
                                </th>
                                <td>{line.quantity ?? '—'}</td>
                                <td>{line.unit || '—'}</td>
                                <td>{line.supplierName || '—'}</td>
                                <td>{typeof line.unitPriceZAR === 'number' ? money(line.unitPriceZAR) : 'Contact supplier for price'}</td>
                                <td>{typeof line.quantityCostZAR === 'number' ? money(line.quantityCostZAR) : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <dl className='cost-totals'>
                <div>
                    <dt>Known materials</dt>
                    <dd>{money(cost.materialsSubtotalZAR)}</dd>
                </div>
                <div>
                    <dt>Delivery</dt>
                    <dd>{typeof cost.deliveryEstimateZAR === 'number' ? money(cost.deliveryEstimateZAR) : 'Unknown'}</dd>
                </div>
                <div>
                    <dt>Contingency</dt>
                    <dd>{typeof cost.contingencyZAR === 'number' ? money(cost.contingencyZAR) : '—'}</dd>
                </div>
                <div>
                    <dt>Low estimate</dt>
                    <dd>{money(cost.lowEstimateZAR)}</dd>
                </div>
                <div>
                    <dt>Central estimate</dt>
                    <dd>{money(cost.estimatedTotalZAR)}</dd>
                </div>
                <div>
                    <dt>High estimate</dt>
                    <dd>{money(cost.highEstimateZAR)}</dd>
                </div>
            </dl>
            <p>Prices are indicative planning information, not supplier quotations.</p>
            {savings.length ? (
                <div className='cost-savings'>
                    <h4>Ways to reduce cost</h4>
                    <ul>
                        {savings.map((item) => (
                            <li key={item.title}>
                                <strong>{item.title}.</strong> {item.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </section>
    );
}

export default CostPreview;
