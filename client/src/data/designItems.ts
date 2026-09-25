export type DesignCategory = 'material' | 'furniture';

export type DesignItem = {
    type: string;
    category: DesignCategory;
    label: string;
};

export type PlacedItem = DesignItem & {
    id: string;
    rowBreak?: boolean;
};

export type CatalogGroup = {
    id: string;
    label: string;
    items: DesignItem[];
};

export const materialGroups: CatalogGroup[] = [
    {
        "id": "structure-masonry",
        "label": "Structure & masonry",
        "items": [
            {
                "type": "timber",
                "category": "material",
                "label": "Timber"
            },
            {
                "type": "treated-timber",
                "category": "material",
                "label": "Treated timber"
            },
            {
                "type": "engineered-timber",
                "category": "material",
                "label": "Engineered timber"
            },
            {
                "type": "plywood",
                "category": "material",
                "label": "Plywood"
            },
            {
                "type": "osb-board",
                "category": "material",
                "label": "OSB board"
            },
            {
                "type": "bamboo",
                "category": "material",
                "label": "Bamboo"
            },
            {
                "type": "steel-beam",
                "category": "material",
                "label": "Steel beam"
            },
            {
                "type": "steel-channel",
                "category": "material",
                "label": "Steel channel"
            },
            {
                "type": "steel-angle",
                "category": "material",
                "label": "Steel angle"
            },
            {
                "type": "steel-tube",
                "category": "material",
                "label": "Steel tube"
            },
            {
                "type": "rebar",
                "category": "material",
                "label": "Rebar"
            },
            {
                "type": "reinforcing-mesh",
                "category": "material",
                "label": "Reinforcing mesh"
            },
            {
                "type": "steel-plate",
                "category": "material",
                "label": "Steel plate"
            },
            {
                "type": "metal-sheet",
                "category": "material",
                "label": "Metal sheet"
            },
            {
                "type": "corrugated-metal-sheet",
                "category": "material",
                "label": "Corrugated metal sheet"
            },
            {
                "type": "clay-brick",
                "category": "material",
                "label": "Clay brick"
            },
            {
                "type": "concrete-brick",
                "category": "material",
                "label": "Concrete brick"
            },
            {
                "type": "concrete-block",
                "category": "material",
                "label": "Concrete block"
            },
            {
                "type": "aac-block",
                "category": "material",
                "label": "AAC block"
            },
            {
                "type": "natural-stone",
                "category": "material",
                "label": "Natural stone"
            },
            {
                "type": "concrete",
                "category": "material",
                "label": "Concrete"
            },
            {
                "type": "precast-concrete",
                "category": "material",
                "label": "Precast concrete"
            }
        ]
    },
    {
        "id": "binders-aggregates",
        "label": "Binders & aggregates",
        "items": [
            {
                "type": "cement",
                "category": "material",
                "label": "Cement"
            },
            {
                "type": "mortar",
                "category": "material",
                "label": "Mortar"
            },
            {
                "type": "plaster",
                "category": "material",
                "label": "Plaster"
            },
            {
                "type": "screed",
                "category": "material",
                "label": "Screed"
            },
            {
                "type": "sand",
                "category": "material",
                "label": "Sand"
            },
            {
                "type": "gravel",
                "category": "material",
                "label": "Gravel"
            },
            {
                "type": "aggregate",
                "category": "material",
                "label": "Aggregate"
            },
            {
                "type": "lime",
                "category": "material",
                "label": "Lime"
            },
            {
                "type": "grout",
                "category": "material",
                "label": "Grout"
            },
            {
                "type": "concrete-admixture",
                "category": "material",
                "label": "Concrete admixture"
            }
        ]
    },
    {
        "id": "roofing-envelope",
        "label": "Roofing & envelope",
        "items": [
            {
                "type": "roof-tile",
                "category": "material",
                "label": "Roof tile"
            },
            {
                "type": "concrete-roof-tile",
                "category": "material",
                "label": "Concrete roof tile"
            },
            {
                "type": "clay-roof-tile",
                "category": "material",
                "label": "Clay roof tile"
            },
            {
                "type": "metal-roofing",
                "category": "material",
                "label": "Metal roofing"
            },
            {
                "type": "ibr-roofing",
                "category": "material",
                "label": "IBR roofing"
            },
            {
                "type": "corrugated-roofing",
                "category": "material",
                "label": "Corrugated roofing"
            },
            {
                "type": "polycarbonate-roofing",
                "category": "material",
                "label": "Polycarbonate roofing"
            },
            {
                "type": "thatch",
                "category": "material",
                "label": "Thatch"
            },
            {
                "type": "waterproof-membrane",
                "category": "material",
                "label": "Waterproof membrane"
            },
            {
                "type": "damp-proof-membrane",
                "category": "material",
                "label": "Damp-proof membrane"
            },
            {
                "type": "house-wrap",
                "category": "material",
                "label": "House wrap"
            },
            {
                "type": "insulation-roll",
                "category": "material",
                "label": "Insulation roll"
            },
            {
                "type": "rigid-insulation",
                "category": "material",
                "label": "Rigid insulation"
            },
            {
                "type": "spray-foam",
                "category": "material",
                "label": "Spray foam"
            },
            {
                "type": "ceiling-board",
                "category": "material",
                "label": "Ceiling board"
            },
            {
                "type": "gypsum-board",
                "category": "material",
                "label": "Gypsum board"
            },
            {
                "type": "fibre-cement-board",
                "category": "material",
                "label": "Fibre cement board"
            },
            {
                "type": "exterior-cladding",
                "category": "material",
                "label": "Exterior cladding"
            }
        ]
    },
    {
        "id": "openings-glazing",
        "label": "Openings & glazing",
        "items": [
            {
                "type": "window",
                "category": "material",
                "label": "Window"
            },
            {
                "type": "aluminium-window",
                "category": "material",
                "label": "Aluminium window"
            },
            {
                "type": "timber-window",
                "category": "material",
                "label": "Timber window"
            },
            {
                "type": "steel-window",
                "category": "material",
                "label": "Steel window"
            },
            {
                "type": "glass-pane",
                "category": "material",
                "label": "Glass pane"
            },
            {
                "type": "double-glazing",
                "category": "material",
                "label": "Double glazing"
            },
            {
                "type": "door",
                "category": "material",
                "label": "Door"
            },
            {
                "type": "timber-door",
                "category": "material",
                "label": "Timber door"
            },
            {
                "type": "steel-door",
                "category": "material",
                "label": "Steel door"
            },
            {
                "type": "sliding-door",
                "category": "material",
                "label": "Sliding door"
            },
            {
                "type": "security-gate",
                "category": "material",
                "label": "Security gate"
            },
            {
                "type": "burglar-bars",
                "category": "material",
                "label": "Burglar bars"
            },
            {
                "type": "window-frame",
                "category": "material",
                "label": "Window frame"
            },
            {
                "type": "door-frame",
                "category": "material",
                "label": "Door frame"
            }
        ]
    },
    {
        "id": "finishes-surfaces",
        "label": "Finishes & surfaces",
        "items": [
            {
                "type": "paint",
                "category": "material",
                "label": "Paint"
            },
            {
                "type": "primer",
                "category": "material",
                "label": "Primer"
            },
            {
                "type": "sealant",
                "category": "material",
                "label": "Sealant"
            },
            {
                "type": "construction-adhesive",
                "category": "material",
                "label": "Construction adhesive"
            },
            {
                "type": "tile-adhesive",
                "category": "material",
                "label": "Tile adhesive"
            },
            {
                "type": "wall-tile",
                "category": "material",
                "label": "Wall tile"
            },
            {
                "type": "floor-tile",
                "category": "material",
                "label": "Floor tile"
            },
            {
                "type": "ceramic-tile",
                "category": "material",
                "label": "Ceramic tile"
            },
            {
                "type": "porcelain-tile",
                "category": "material",
                "label": "Porcelain tile"
            },
            {
                "type": "vinyl-flooring",
                "category": "material",
                "label": "Vinyl flooring"
            },
            {
                "type": "laminate-flooring",
                "category": "material",
                "label": "Laminate flooring"
            },
            {
                "type": "timber-flooring",
                "category": "material",
                "label": "Timber flooring"
            },
            {
                "type": "carpet",
                "category": "material",
                "label": "Carpet"
            },
            {
                "type": "polished-concrete",
                "category": "material",
                "label": "Polished concrete"
            },
            {
                "type": "countertop",
                "category": "material",
                "label": "Countertop"
            },
            {
                "type": "skirting",
                "category": "material",
                "label": "Skirting"
            },
            {
                "type": "cornice",
                "category": "material",
                "label": "Cornice"
            },
            {
                "type": "wallpaper",
                "category": "material",
                "label": "Wallpaper"
            },
            {
                "type": "stone-veneer",
                "category": "material",
                "label": "Stone veneer"
            },
            {
                "type": "brick-veneer",
                "category": "material",
                "label": "Brick veneer"
            },
            {
                "type": "exterior-render",
                "category": "material",
                "label": "Exterior render"
            }
        ]
    },
    {
        "id": "plumbing-electrical-energy",
        "label": "Plumbing, electrical & energy",
        "items": [
            {
                "type": "water-pipe",
                "category": "material",
                "label": "Water pipe"
            },
            {
                "type": "pvc-pipe",
                "category": "material",
                "label": "PVC pipe"
            },
            {
                "type": "pex-pipe",
                "category": "material",
                "label": "PEX pipe"
            },
            {
                "type": "copper-pipe",
                "category": "material",
                "label": "Copper pipe"
            },
            {
                "type": "drain-pipe",
                "category": "material",
                "label": "Drain pipe"
            },
            {
                "type": "plumbing-fitting",
                "category": "material",
                "label": "Plumbing fitting"
            },
            {
                "type": "electrical-wire",
                "category": "material",
                "label": "Electrical wire"
            },
            {
                "type": "electrical-cable",
                "category": "material",
                "label": "Electrical cable"
            },
            {
                "type": "electrical-conduit",
                "category": "material",
                "label": "Electrical conduit"
            },
            {
                "type": "electrical-box",
                "category": "material",
                "label": "Electrical box"
            },
            {
                "type": "light-switch",
                "category": "material",
                "label": "Light switch"
            },
            {
                "type": "power-outlet",
                "category": "material",
                "label": "Power outlet"
            },
            {
                "type": "circuit-breaker-panel",
                "category": "material",
                "label": "Circuit breaker panel"
            },
            {
                "type": "junction-box",
                "category": "material",
                "label": "Junction box"
            },
            {
                "type": "light-fitting",
                "category": "material",
                "label": "Light fitting"
            },
            {
                "type": "solar-panel",
                "category": "material",
                "label": "Solar panel"
            },
            {
                "type": "solar-inverter",
                "category": "material",
                "label": "Solar inverter"
            },
            {
                "type": "battery",
                "category": "material",
                "label": "Battery"
            },
            {
                "type": "water-tank",
                "category": "material",
                "label": "Water tank"
            },
            {
                "type": "rainwater-gutter",
                "category": "material",
                "label": "Rainwater gutter"
            },
            {
                "type": "downpipe",
                "category": "material",
                "label": "Downpipe"
            },
            {
                "type": "water-heater",
                "category": "material",
                "label": "Water heater"
            },
            {
                "type": "solar-water-heater",
                "category": "material",
                "label": "Solar water heater"
            },
            {
                "type": "ventilation-duct",
                "category": "material",
                "label": "Ventilation duct"
            },
            {
                "type": "vent",
                "category": "material",
                "label": "Vent"
            },
            {
                "type": "chimney",
                "category": "material",
                "label": "Chimney"
            },
            {
                "type": "drainage-channel",
                "category": "material",
                "label": "Drainage channel"
            }
        ]
    },
    {
        "id": "hardware-fasteners",
        "label": "Hardware & fasteners",
        "items": [
            {
                "type": "nails",
                "category": "material",
                "label": "Nails"
            },
            {
                "type": "screws",
                "category": "material",
                "label": "Screws"
            },
            {
                "type": "bolts",
                "category": "material",
                "label": "Bolts"
            },
            {
                "type": "nuts",
                "category": "material",
                "label": "Nuts"
            },
            {
                "type": "washers",
                "category": "material",
                "label": "Washers"
            },
            {
                "type": "hinges",
                "category": "material",
                "label": "Hinges"
            },
            {
                "type": "brackets",
                "category": "material",
                "label": "Brackets"
            },
            {
                "type": "wall-anchors",
                "category": "material",
                "label": "Wall anchors"
            },
            {
                "type": "rivets",
                "category": "material",
                "label": "Rivets"
            },
            {
                "type": "wire-mesh",
                "category": "material",
                "label": "Wire mesh"
            },
            {
                "type": "chain-link-mesh",
                "category": "material",
                "label": "Chain-link mesh"
            },
            {
                "type": "roofing-screws",
                "category": "material",
                "label": "Roofing screws"
            },
            {
                "type": "door-lock",
                "category": "material",
                "label": "Door lock"
            },
            {
                "type": "door-handle",
                "category": "material",
                "label": "Door handle"
            },
            {
                "type": "latch",
                "category": "material",
                "label": "Latch"
            },
            {
                "type": "silicone",
                "category": "material",
                "label": "Silicone"
            },
            {
                "type": "weather-stripping",
                "category": "material",
                "label": "Weather stripping"
            }
        ]
    },
    {
        "id": "exterior-site",
        "label": "Exterior & site",
        "items": [
            {
                "type": "pavers",
                "category": "material",
                "label": "Pavers"
            },
            {
                "type": "paving-brick",
                "category": "material",
                "label": "Paving brick"
            },
            {
                "type": "fencing",
                "category": "material",
                "label": "Fencing"
            },
            {
                "type": "timber-fence",
                "category": "material",
                "label": "Timber fence"
            },
            {
                "type": "palisade-fence",
                "category": "material",
                "label": "Palisade fence"
            },
            {
                "type": "chain-link-fence",
                "category": "material",
                "label": "Chain-link fence"
            },
            {
                "type": "gate",
                "category": "material",
                "label": "Gate"
            },
            {
                "type": "railing",
                "category": "material",
                "label": "Railing"
            },
            {
                "type": "stairs",
                "category": "material",
                "label": "Stairs"
            },
            {
                "type": "ramp",
                "category": "material",
                "label": "Ramp"
            },
            {
                "type": "decking",
                "category": "material",
                "label": "Decking"
            },
            {
                "type": "pergola",
                "category": "material",
                "label": "Pergola"
            },
            {
                "type": "awning",
                "category": "material",
                "label": "Awning"
            },
            {
                "type": "shade-cloth",
                "category": "material",
                "label": "Shade cloth"
            },
            {
                "type": "geotextile",
                "category": "material",
                "label": "Geotextile"
            },
            {
                "type": "landscaping-stone",
                "category": "material",
                "label": "Landscaping stone"
            },
            {
                "type": "topsoil",
                "category": "material",
                "label": "Topsoil"
            },
            {
                "type": "grass-sod",
                "category": "material",
                "label": "Grass sod"
            },
            {
                "type": "drainage-gravel",
                "category": "material",
                "label": "Drainage gravel"
            }
        ]
    }
];

export const furnitureGroups: CatalogGroup[] = [
    {
        "id": "seating",
        "label": "Seating",
        "items": [
            {
                "type": "sofa",
                "category": "furniture",
                "label": "Sofa"
            },
            {
                "type": "loveseat",
                "category": "furniture",
                "label": "Loveseat"
            },
            {
                "type": "armchair",
                "category": "furniture",
                "label": "Armchair"
            },
            {
                "type": "lounge-chair",
                "category": "furniture",
                "label": "Lounge chair"
            },
            {
                "type": "dining-chair",
                "category": "furniture",
                "label": "Dining chair"
            },
            {
                "type": "office-chair",
                "category": "furniture",
                "label": "Office chair"
            },
            {
                "type": "bench",
                "category": "furniture",
                "label": "Bench"
            },
            {
                "type": "stool",
                "category": "furniture",
                "label": "Stool"
            },
            {
                "type": "bar-stool",
                "category": "furniture",
                "label": "Bar stool"
            },
            {
                "type": "ottoman",
                "category": "furniture",
                "label": "Ottoman"
            }
        ]
    },
    {
        "id": "tables-work",
        "label": "Tables & work",
        "items": [
            {
                "type": "dining-table",
                "category": "furniture",
                "label": "Dining table"
            },
            {
                "type": "coffee-table",
                "category": "furniture",
                "label": "Coffee table"
            },
            {
                "type": "side-table",
                "category": "furniture",
                "label": "Side table"
            },
            {
                "type": "bedside-table",
                "category": "furniture",
                "label": "Bedside table"
            },
            {
                "type": "desk",
                "category": "furniture",
                "label": "Desk"
            },
            {
                "type": "workbench",
                "category": "furniture",
                "label": "Workbench"
            },
            {
                "type": "console-table",
                "category": "furniture",
                "label": "Console table"
            },
            {
                "type": "folding-table",
                "category": "furniture",
                "label": "Folding table"
            },
            {
                "type": "kitchen-island",
                "category": "furniture",
                "label": "Kitchen island"
            }
        ]
    },
    {
        "id": "sleep",
        "label": "Sleep",
        "items": [
            {
                "type": "single-bed",
                "category": "furniture",
                "label": "Single bed"
            },
            {
                "type": "double-bed",
                "category": "furniture",
                "label": "Double bed"
            },
            {
                "type": "queen-bed",
                "category": "furniture",
                "label": "Queen bed"
            },
            {
                "type": "bunk-bed",
                "category": "furniture",
                "label": "Bunk bed"
            },
            {
                "type": "cot",
                "category": "furniture",
                "label": "Cot"
            },
            {
                "type": "crib",
                "category": "furniture",
                "label": "Crib"
            },
            {
                "type": "mattress",
                "category": "furniture",
                "label": "Mattress"
            },
            {
                "type": "headboard",
                "category": "furniture",
                "label": "Headboard"
            }
        ]
    },
    {
        "id": "storage",
        "label": "Storage",
        "items": [
            {
                "type": "wardrobe",
                "category": "furniture",
                "label": "Wardrobe"
            },
            {
                "type": "dresser",
                "category": "furniture",
                "label": "Dresser"
            },
            {
                "type": "chest-of-drawers",
                "category": "furniture",
                "label": "Chest of drawers"
            },
            {
                "type": "bookshelf",
                "category": "furniture",
                "label": "Bookshelf"
            },
            {
                "type": "storage-cabinet",
                "category": "furniture",
                "label": "Storage cabinet"
            },
            {
                "type": "kitchen-cabinet",
                "category": "furniture",
                "label": "Kitchen cabinet"
            },
            {
                "type": "wall-cabinet",
                "category": "furniture",
                "label": "Wall cabinet"
            },
            {
                "type": "tv-stand",
                "category": "furniture",
                "label": "TV stand"
            },
            {
                "type": "shelf",
                "category": "furniture",
                "label": "Shelf"
            },
            {
                "type": "shoe-rack",
                "category": "furniture",
                "label": "Shoe rack"
            },
            {
                "type": "storage-trunk",
                "category": "furniture",
                "label": "Storage trunk"
            },
            {
                "type": "pantry-unit",
                "category": "furniture",
                "label": "Pantry unit"
            }
        ]
    },
    {
        "id": "kitchen",
        "label": "Kitchen",
        "items": [
            {
                "type": "kitchen-sink",
                "category": "furniture",
                "label": "Kitchen sink"
            },
            {
                "type": "stove",
                "category": "furniture",
                "label": "Stove"
            },
            {
                "type": "gas-stove",
                "category": "furniture",
                "label": "Gas stove"
            },
            {
                "type": "induction-plate",
                "category": "furniture",
                "label": "Induction plate"
            },
            {
                "type": "oven",
                "category": "furniture",
                "label": "Oven"
            },
            {
                "type": "cooktop",
                "category": "furniture",
                "label": "Cooktop"
            },
            {
                "type": "refrigerator",
                "category": "furniture",
                "label": "Refrigerator"
            },
            {
                "type": "freezer",
                "category": "furniture",
                "label": "Freezer"
            },
            {
                "type": "microwave",
                "category": "furniture",
                "label": "Microwave"
            },
            {
                "type": "dishwasher",
                "category": "furniture",
                "label": "Dishwasher"
            },
            {
                "type": "kettle",
                "category": "furniture",
                "label": "Kettle"
            },
            {
                "type": "toaster",
                "category": "furniture",
                "label": "Toaster"
            },
            {
                "type": "range-hood",
                "category": "furniture",
                "label": "Range hood"
            },
            {
                "type": "kitchen-countertop",
                "category": "furniture",
                "label": "Kitchen countertop"
            }
        ]
    },
    {
        "id": "bathroom",
        "label": "Bathroom",
        "items": [
            {
                "type": "toilet",
                "category": "furniture",
                "label": "Toilet"
            },
            {
                "type": "wash-basin",
                "category": "furniture",
                "label": "Wash basin"
            },
            {
                "type": "bathroom-vanity",
                "category": "furniture",
                "label": "Bathroom vanity"
            },
            {
                "type": "shower",
                "category": "furniture",
                "label": "Shower"
            },
            {
                "type": "bathtub",
                "category": "furniture",
                "label": "Bathtub"
            },
            {
                "type": "shower-enclosure",
                "category": "furniture",
                "label": "Shower enclosure"
            },
            {
                "type": "bathroom-cabinet",
                "category": "furniture",
                "label": "Bathroom cabinet"
            },
            {
                "type": "bathroom-mirror",
                "category": "furniture",
                "label": "Bathroom mirror"
            },
            {
                "type": "towel-rail",
                "category": "furniture",
                "label": "Towel rail"
            }
        ]
    },
    {
        "id": "lighting-climate",
        "label": "Lighting & climate",
        "items": [
            {
                "type": "table-lamp",
                "category": "furniture",
                "label": "Table lamp"
            },
            {
                "type": "floor-lamp",
                "category": "furniture",
                "label": "Floor lamp"
            },
            {
                "type": "pendant-light",
                "category": "furniture",
                "label": "Pendant light"
            },
            {
                "type": "ceiling-light",
                "category": "furniture",
                "label": "Ceiling light"
            },
            {
                "type": "wall-light",
                "category": "furniture",
                "label": "Wall light"
            },
            {
                "type": "ceiling-fan",
                "category": "furniture",
                "label": "Ceiling fan"
            },
            {
                "type": "standing-fan",
                "category": "furniture",
                "label": "Standing fan"
            },
            {
                "type": "air-conditioner",
                "category": "furniture",
                "label": "Air conditioner"
            },
            {
                "type": "space-heater",
                "category": "furniture",
                "label": "Space heater"
            },
            {
                "type": "fireplace",
                "category": "furniture",
                "label": "Fireplace"
            }
        ]
    },
    {
        "id": "electronics",
        "label": "Electronics",
        "items": [
            {
                "type": "television",
                "category": "furniture",
                "label": "Television"
            },
            {
                "type": "speaker",
                "category": "furniture",
                "label": "Speaker"
            },
            {
                "type": "radio",
                "category": "furniture",
                "label": "Radio"
            },
            {
                "type": "wi-fi-router",
                "category": "furniture",
                "label": "Wi-Fi router"
            },
            {
                "type": "desktop-computer",
                "category": "furniture",
                "label": "Desktop computer"
            },
            {
                "type": "laptop",
                "category": "furniture",
                "label": "Laptop"
            },
            {
                "type": "phone-charging-station",
                "category": "furniture",
                "label": "Phone charging station"
            }
        ]
    },
    {
        "id": "decor-textiles",
        "label": "Decor & textiles",
        "items": [
            {
                "type": "rug",
                "category": "furniture",
                "label": "Rug"
            },
            {
                "type": "curtains",
                "category": "furniture",
                "label": "Curtains"
            },
            {
                "type": "cushion",
                "category": "furniture",
                "label": "Cushion"
            },
            {
                "type": "indoor-plant",
                "category": "furniture",
                "label": "Indoor plant"
            },
            {
                "type": "artwork",
                "category": "furniture",
                "label": "Artwork"
            },
            {
                "type": "wall-clock",
                "category": "furniture",
                "label": "Wall clock"
            },
            {
                "type": "vase",
                "category": "furniture",
                "label": "Vase"
            },
            {
                "type": "blinds",
                "category": "furniture",
                "label": "Blinds"
            },
            {
                "type": "mosquito-net",
                "category": "furniture",
                "label": "Mosquito net"
            },
            {
                "type": "room-divider",
                "category": "furniture",
                "label": "Room divider"
            },
            {
                "type": "doormat",
                "category": "furniture",
                "label": "Doormat"
            },
            {
                "type": "blanket",
                "category": "furniture",
                "label": "Blanket"
            },
            {
                "type": "bedding-set",
                "category": "furniture",
                "label": "Bedding set"
            },
            {
                "type": "curtain-rod",
                "category": "furniture",
                "label": "Curtain rod"
            }
        ]
    },
    {
        "id": "laundry-utility",
        "label": "Laundry & utility",
        "items": [
            {
                "type": "washing-machine",
                "category": "furniture",
                "label": "Washing machine"
            },
            {
                "type": "laundry-basket",
                "category": "furniture",
                "label": "Laundry basket"
            },
            {
                "type": "ironing-board",
                "category": "furniture",
                "label": "Ironing board"
            },
            {
                "type": "iron",
                "category": "furniture",
                "label": "Iron"
            },
            {
                "type": "drying-rack",
                "category": "furniture",
                "label": "Drying rack"
            },
            {
                "type": "vacuum-cleaner",
                "category": "furniture",
                "label": "Vacuum cleaner"
            },
            {
                "type": "mop-bucket",
                "category": "furniture",
                "label": "Mop bucket"
            },
            {
                "type": "waste-bin",
                "category": "furniture",
                "label": "Waste bin"
            },
            {
                "type": "clothes-rail",
                "category": "furniture",
                "label": "Clothes rail"
            }
        ]
    },
    {
        "id": "outdoor",
        "label": "Outdoor",
        "items": [
            {
                "type": "patio-chair",
                "category": "furniture",
                "label": "Patio chair"
            },
            {
                "type": "outdoor-table",
                "category": "furniture",
                "label": "Outdoor table"
            },
            {
                "type": "braai-grill",
                "category": "furniture",
                "label": "Braai grill"
            },
            {
                "type": "planter",
                "category": "furniture",
                "label": "Planter"
            },
            {
                "type": "garden-bench",
                "category": "furniture",
                "label": "Garden bench"
            },
            {
                "type": "hammock",
                "category": "furniture",
                "label": "Hammock"
            },
            {
                "type": "outdoor-storage-box",
                "category": "furniture",
                "label": "Outdoor storage box"
            },
            {
                "type": "clothesline",
                "category": "furniture",
                "label": "Clothesline"
            },
            {
                "type": "bicycle-rack",
                "category": "furniture",
                "label": "Bicycle rack"
            }
        ]
    }
];

export const materials: DesignItem[] = materialGroups.flatMap((group) => group.items);

export const furniture: DesignItem[] = furnitureGroups.flatMap((group) => group.items);
