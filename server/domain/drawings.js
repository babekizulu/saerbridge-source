const { mmToM, areaMm2ToM2 } = require('./units');

function escapeXml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function blueprintSvg(plan) {
    if (!plan.geometry || plan.geometry.status !== 'SOLVED') {
        return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80"><text x="12" y="40">Dwelling footprint was not generated.</text></svg>';
    }
    const footprint = plan.geometry.footprint;
    const pad = 800;
    const width = footprint.widthMm + pad * 2;
    const height = footprint.lengthMm + pad * 2;
    const rooms = plan.rooms.map((room) => {
        const label = `${room.name} ${mmToM(room.widthMm)} x ${mmToM(room.lengthMm)} m`;
        return `<rect x="${room.xMm + pad}" y="${room.yMm + pad}" width="${room.widthMm}" height="${room.lengthMm}" fill="#f7f4ea" stroke="#11233a" stroke-width="20" />
<text x="${room.xMm + pad + 80}" y="${room.yMm + pad + 220}" font-size="160" fill="#11233a">${escapeXml(label)}</text>
<text x="${room.xMm + pad + 80}" y="${room.yMm + pad + 420}" font-size="140" fill="#465343">${areaMm2ToM2(room.areaMm2)} m2</text>`;
    }).join('');
    const title = `${plan.conceptName || plan.projectId} rev ${plan.revision} · ${mmToM(footprint.widthMm)} x ${mmToM(footprint.lengthMm)} m · ${areaMm2ToM2(footprint.areaMm2)} m2`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(title)}</title>
<rect x="${pad}" y="${pad}" width="${footprint.widthMm}" height="${footprint.lengthMm}" fill="none" stroke="#11233a" stroke-width="40" />
${rooms}
<text x="${pad}" y="${pad - 200}" font-size="180" fill="#11233a">${escapeXml(title)}</text>
<text x="${pad}" y="${height - 200}" font-size="140" fill="#465343">Scale is real millimetres. Not an engineering drawing. North is toward the top of this plan.</text>
</svg>`;
}

function dxfPair(code, value) {
    return `${code}\n${value}\n`;
}

function blueprintDxf(plan) {
    let body = '';
    const addLine = (x1, y1, x2, y2, layer) => {
        body += dxfPair(0, 'LINE');
        body += dxfPair(8, layer);
        body += dxfPair(10, x1);
        body += dxfPair(20, y1);
        body += dxfPair(11, x2);
        body += dxfPair(21, y2);
    };
    (plan.walls || []).forEach((wall) => {
        addLine(wall.start.xMm, wall.start.yMm, wall.end.xMm, wall.end.yMm, wall.exterior ? 'A-WALL-EXTR' : 'A-WALL-INTR');
    });
    const header = `${dxfPair(0, 'SECTION')}${dxfPair(2, 'HEADER')}${dxfPair(9, '$ACADVER')}${dxfPair(1, 'AC1009')}${dxfPair(0, 'ENDSEC')}`;
    const entities = `${dxfPair(0, 'SECTION')}${dxfPair(2, 'ENTITIES')}${body}${dxfPair(0, 'ENDSEC')}`;
    return `${header}${entities}${dxfPair(0, 'EOF')}`;
}

module.exports = {
    blueprintSvg,
    blueprintDxf,
};
