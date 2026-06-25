export const VEHICLE_MAKES: string[] = [
  "Acura","Alfa Romeo","Audi","BYD","BMW","Changan","Chery","Chevrolet","Citroën",
  "DFSK","Dodge","Fiat","Ford","Geely","Great Wall","Haval","Honda","Hyundai",
  "Infiniti","Isuzu","JAC","Jaguar","Jeep","Kia","Land Rover","Lexus","Mahindra",
  "MAXUS","Mazda","Mercedes-Benz","MG","Mini","Mitsubishi","Nissan","Peugeot",
  "Porsche","Ram","Renault","Seat","Skoda","Ssangyong","Subaru","Suzuki","Toyota",
  "Volkswagen","Volvo","Zotye",
]

export const VEHICLE_MODELS: Record<string, string[]> = {
  "Toyota":       ["Corolla","Yaris","Hilux","Land Cruiser Prado","Land Cruiser","RAV4","Fortuner","Camry","CH-R","Hiace","Prius","Prius Plus","Avalon","Venza","Corolla Cross","Rush","FJ Cruiser","4Runner"],
  "Chevrolet":    ["Sail","Spark","Tracker","Captiva","Silverado","Colorado","Cavalier","Equinox","Blazer","Groove","Orlando","Trax","Dmax","S10"],
  "Ford":         ["Ranger","Explorer","EcoSport","Mustang","F-150","Focus","Territory","Edge","Escape","Transit","Maverick","Bronco","Expedition"],
  "Hyundai":      ["Tucson","Santa Fe","Elantra","Accent","Creta","Grand i10","Ioniq","Ioniq 5","Ioniq 6","Kona","Venue","Palisade","Staria","H-1","Sonata","i30"],
  "Kia":          ["Sportage","Seltos","Rio","Cerato","Sorento","Stinger","Carnival","Picanto","K5","EV6","Stonic","Niro","Soul","Telluride"],
  "Nissan":       ["Navara","X-Trail","Murano","Frontier","Versa","Kicks","Sentra","March","Terra","Pathfinder","Armada","Leaf","Magnite"],
  "Volkswagen":   ["Golf","Jetta","Amarok","Tiguan","Polo","Passat","Taos","T-Cross","Touareg","T-Roc","Virtus","ID.4","Saveiro"],
  "Honda":        ["Civic","CR-V","HR-V","Accord","WR-V","Pilot","Jazz","BR-V","ZR-V","City","Ridgeline","Odyssey"],
  "Mazda":        ["CX-5","CX-3","CX-30","CX-50","CX-60","CX-90","Mazda3","Mazda6","MX-5","BT-50"],
  "Suzuki":       ["Vitara","Grand Vitara","Swift","Jimny","Ertiga","S-Cross","Ignis","Carry","Super Carry","Ciaz"],
  "Mitsubishi":   ["L200","Outlander","ASX","Eclipse Cross","Pajero","Galant Fortis","Eclipse","Lancer","Outlander PHEV"],
  "Subaru":       ["Outback","Forester","XV","Impreza","Legacy","WRX","BRZ","Solterra","Ascent"],
  "Jeep":         ["Wrangler","Cherokee","Grand Cherokee","Compass","Renegade","Gladiator","Grand Wagoneer"],
  "Renault":      ["Duster","Koleos","Logan","Sandero","Clio","Kwid","Oroch","Kangoo","Master","Stepway"],
  "Peugeot":      ["208","308","408","3008","5008","Partner","Expert","Boxer","Rifter","2008","e-208","e-2008"],
  "Citroën":      ["C3","C4","C5 Aircross","C3 Aircross","Berlingo","Jumper","SpaceTourer","ë-C4"],
  "Fiat":         ["Argo","Cronos","Mobi","500","Toro","Strada","Ducato","Doblo","Fiorino"],
  "BMW":          ["Serie 1","Serie 2","Serie 3","Serie 4","Serie 5","Serie 7","X1","X2","X3","X4","X5","X6","X7","M3","M5","iX","i4","i5"],
  "Mercedes-Benz":["Clase A","Clase B","Clase C","Clase E","Clase S","GLA","GLB","GLC","GLE","GLS","AMG GT","Sprinter","Vito","EQA","EQB","EQC","EQE","EQS"],
  "Audi":         ["A1","A3","A4","A5","A6","A7","A8","Q2","Q3","Q4","Q5","Q7","Q8","e-tron","e-tron GT","TT","R8"],
  "Volvo":        ["XC40","XC60","XC90","V60","V90","S60","S90","C40","EX40","EX90"],
  "Land Rover":   ["Discovery","Discovery Sport","Defender","Range Rover","Range Rover Sport","Range Rover Evoque","Range Rover Velar","Freelander"],
  "Jaguar":       ["XE","XF","XJ","F-Pace","E-Pace","I-Pace","F-Type"],
  "MAXUS":        ["T60","T90","D60","G10","Deliver 9","G20","Mifa 9","V80"],
  "JAC":          ["S3","S4","S5","T6","T8","iEV","S7","A60"],
  "Great Wall":   ["Wingle","Poer","Cannon","WEY"],
  "Haval":        ["H1","H2","H4","H6","H9","Jolion","Dargo","F7","F7x"],
  "Chery":        ["QQ","Tiggo 2","Tiggo 3X","Tiggo 4","Tiggo 4 Pro","Tiggo 7","Tiggo 7 Pro","Tiggo 8","Arrizo 5","Arrizo 6","OMODA 5"],
  "BYD":          ["Tang","Han","Atto 3","Seal","Song Plus","Dolphin","Yuan Plus","BYD F3","BYD F0"],
  "DFSK":         ["Glory","Glory 580","SX5","C35","C37","Glory i-Auto"],
  "Isuzu":        ["D-Max","MU-X","Forward","Elf","N-Series"],
  "Ssangyong":    ["Rexton","Musso","Korando","Tivoli","XLV","Torres"],
  "Geely":        ["MX11","Coolray","Emgrand","Atlas Pro","Geometry C"],
  "MG":           ["ZS","HS","5","Marvel R","RX5","MG4","One","Cyberster"],
  "Changan":      ["CS35","CS55","CS75","Uni-T","Uni-K","Uni-V","Hunter","Star 3","Lamore"],
  "Dodge":        ["Ram 1500","Ram 2500","Challenger","Charger","Durango","Journey"],
  "Porsche":      ["Cayenne","Macan","Panamera","Taycan","911","718"],
  "Lexus":        ["NX","RX","UX","LX","LC","ES","IS","GX"],
  "Infiniti":     ["Q50","Q60","QX50","QX60","QX80"],
  "Ram":          ["1500","2500","3500","Promaster"],
  "Seat":         ["Ibiza","Leon","Ateca","Tarraco","Arona"],
  "Skoda":        ["Octavia","Superb","Kodiaq","Karoq","Kamiq","Scala","Fabia"],
  "Mini":         ["Cooper","Countryman","Clubman","Paceman","Convertible","Cabrio"],
  "Alfa Romeo":   ["Giulia","Stelvio","Tonale","Giulietta","4C"],
  "Mahindra":     ["Scorpio","XUV500","XUV300","Bolero","Thar"],
  "Acura":        ["MDX","RDX","TLX","NSX"],
  "Zotye":        ["Z300","T600","Z500"],
}

export const VEHICLE_TYPES: string[] = [
  "Auto","Camioneta","Furgón","SUV","Minivan","Hatchback","Sedan","Station Wagon",
  "Pickup","Coupé","Cabriolet","Bus","Moto","Otro",
]

export const VEHICLE_COLORS: string[] = [
  "Blanco","Negro","Gris","Plata","Rojo","Azul","Verde","Amarillo","Naranja",
  "Beige","Café","Dorado","Champagne","Burdeo","Azul Marino","Gris Oscuro","Gris Perla",
  "Blanco Perlado","Negro Metálico","Rojo Metálico","Azul Metálico","Plata Metálico",
]

export const FUEL_TYPES: string[] = [
  "GASOLINA","DIÉSEL","HÍBRIDO","ELÉCTRICO","GAS","HÍBRIDO ENCHUFABLE",
]

export const TRANSMISSION_TYPES: string[] = [
  "MECÁNICA","AUTOMÁTICA","CVT","SEMIAUTOMÁTICA","DOBLE EMBRAGUE",
]

export function getModels(make: string): string[] {
  return VEHICLE_MODELS[make] ?? []
}
