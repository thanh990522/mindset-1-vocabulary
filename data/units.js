export const unitsRegistry = [
  {
    "id": "unit-1",
    "number": 1,
    "title": "Relationships",
    "icon": "👥",
    "status": "available",
    "module": "./data/unit1.js"
  },
  {
    "id": "unit-2",
    "number": 2,
    "title": "Places and Buildings",
    "icon": "🏡",
    "status": "available",
    "module": "./data/unit2.js"
  },
  {
    "id": "unit-3",
    "number": 3,
    "title": "Education and Employment",
    "icon": "🎓",
    "status": "available",
    "module": "./data/unit3.js"
  },
  {
    "id": "unit-4",
    "number": 4,
    "title": "Food and Drink",
    "icon": "🍽️",
    "status": "available",
    "module": "./data/unit4.js"
  },
  {
    "id": "unit-5",
    "number": 5,
    "title": "Consumerism",
    "icon": "🛍️",
    "status": "available",
    "module": "./data/unit5.js"
  },
  {
    "id": "unit-6",
    "number": 6,
    "title": "Leisure Time",
    "icon": "🎨",
    "status": "available",
    "module": "./data/unit6.js"
  },
  {
    "id": "unit-7",
    "number": 7,
    "title": "Fame and Media",
    "icon": "🌟",
    "status": "available",
    "module": "./data/unit7.js"
  },
  {
    "id": "unit-8",
    "number": 8,
    "title": "The Natural World",
    "icon": "🐬",
    "status": "available",
    "module": "./data/unit8.js"
  }
];

export function availableUnits() { return unitsRegistry.filter(unit => unit.status === "available" && unit.module); }
