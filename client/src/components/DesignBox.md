# Design Box

The Design Box is the drop target on the Project Planner page. People drag generic building materials and furniture into it, arrange them, then generate a home concept.

Dropping an item only updates the box. Nothing is sent until the generate icon is clicked.

## What you can drag in

The palette under the box lists two groups from `src/data/designItems.ts`:

- **Building materials** such as timber, stone, brick, concrete, steel, glass, and insulation.
- **Furniture and interior items** such as a sofa, bed, table, lamp, and sink.

Each tile is a rounded square with a green icon and a light-green border. The same item can be dropped more than once. Each drop gets its own id.

## Arranging items

An empty box shows “Drag materials and furniture here”.

After the first drop:

- The box grows taller.
- A shimmer runs across it, from white (`$light`) through ultra-light green (`$ultra-light-green`) to light green (`$light-green`).
- Items sit in a wrapping row.

Dragging a new item underneath one that is already in the box opens extra vertical space. Releasing it there starts a new row, with the new item under the existing ones. Dragging onto the same row, beside the existing items, keeps the new item on that row.

The × on a placed tile removes that item. Removing the last item clears the box, the generated image, and the PDF link.

## Generate

The generate icon appears at the bottom right once the box contains at least one item, or once a photograph has been given permission for AI processing. Clicking it sends the current materials and furniture. A permitted photograph is sent only for a renovation concept. While the request is in progress the icon is disabled, and the response area shows “Generating your home design…”.

The accessible name is “Generate home concept” or “Generate renovation concept”.

A newer generation replaces an older one that is still in flight. If the box is emptied and no permitted photograph remains, the image and PDF are cleared without calling the backend.

## Backend contract

`POST /api/home-design`

The body is an object with two arrays. Only `type` and `label` are sent. Placement details such as row breaks stay in the browser.

```json
{
  "materials": [{ "type": "timber", "label": "Timber" }],
  "furniture": [{ "type": "sofa", "label": "Sofa" }]
}
```

The response must include an image and a PDF. Either pair of fields is accepted:

| Image | PDF |
| --- | --- |
| `image` | `pdf` |
| `imageUrl` | `pdfUrl` |

Each value may be a URL, a data URL, or raw base64. A bare image is treated as a PNG. The PDF is saved locally in the browser and offered as a download named `HomeDesignInstructions.pdf`.

On success, the image is shown in the response box and the PDF link appears beneath it. If the request fails or either file is missing, the response box shows “The design could not be generated.”

## Pieces involved

| Piece | Role |
| --- | --- |
| `DesignBox.tsx` | Drop target, row layout, and upload button |
| `Draggable.tsx` | A material or furniture tile |
| `ItemPalette.tsx` | The source list of tiles |
| `buttons/SendBtn.tsx` | The upload icon |
| `pages/ProjectPlanner.tsx` | Holds the placed items and runs the upload |
| `api/homeDesign.ts` | Posts the set and reads the image and PDF |
| `ResponseBox.tsx` | Shows the generated image or an error |
| `PDFGenerator.tsx` | Download link for `HomeDesignInstructions.pdf` |
| `scss/_DesignBox.scss` | Box size, shimmer, and extra row space |
