# Config sources: spot-check table

On 2026-11-24, values were marked verified only when the figure was read on the publisher's own page or document. Everything else keeps `source: "TODO"` and shows as **Provisional** in the app.

## Verified (8 values)

| Config key                                    | Old    | New        | Where to check                                                                                                                                                                                                 |
| --------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tariffs.lpgPerCylinder`                      | 853    | **942**    | [IOCL, Prices of Petroleum Products](https://iocl.com/prices-of-petroleum-products): "Non-Subsidised Prices of Indane in Metros (Rs./14.2 kg cylinder)", Delhi 942.00, last updated 7 June 2026                  |
| `tariffs.lpgCylinderKg`                       | 14.2   | 14.2       | Same IOCL table heading (14.2 kg cylinder)                                                                                                                                                                       |
| `tariffs.petrolPerLitre`                      | 94.77  | **102.12** | [IOCL, Price Buildup of Petrol at Delhi, effective 01-Nov-26](https://iocl.com/admin/img/UploadedFiles/PriceBuildup/Files/English/33bb8af791c64c60be402e4b264acbc6.pdf): "Retail Selling Price at Delhi (Rounded)" |
| `tariffs.pngPerM3`                            | 48.6   | **50.59**  | [IGL, CNG/PNG prices](https://www.iglonline.net/cng-png-prices): "Domestic PNG Retail Prices (w.e.f 2nd September 2026)", NCT of Delhi Rs. 50.59/- per SCM                                                       |
| `factors.co2.lpgKgPerKg`                      | 2.98   | **2.985**  | [IPCC 2006 GL, Vol. 2 Ch. 1](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf): LPG NCV 47.3 TJ/Gg (Table 1.2, p. 1.19) × 63,100 kg CO₂/TJ (Table 1.4, p. 1.24)          |
| `factors.co2.gridKgPerKwh`                    | 0.71   | **0.727**  | [CEA CO2 Baseline Database, User Guide v20.0, Dec 2024](https://cea.nic.in/api/cdm-report-version/view-pdf/en/76): Table S, weighted average 0.727 tCO₂/MWh, FY 2023-24                                         |
| `purifiers[philips-ac1711].cadr` (AC1711/61)  | 300    | 300        | [Philips India, AC1711/61](https://www.philips.co.in/c-p/AC1711_61/1000-series-air-purifier-for-medium-rooms): "300 ㎥/h clean air rate (CADR)"                                                                   |
| `purifiers[philips-ac1711].watts` (AC1711/61) | 25     | **27**     | Same page: "runs at max. 27 W power". The model was changed from AC1711/20 (EU) to AC1711/61 (India)                                                                                                            |

## Worth your attention

- **Grid CO₂:** secondary sites say CEA has since published v21.0 (0.710, FY 2024-25) and v22.0 (0.675, FY 2025-26). I couldn't open CEA's version list (it returned 404), so the value stays at the v20.0 figure I read. If you can open v22.0 on cea.nic.in, update the value and source.
- **WHO guidelines (5 and 15 µg/m³):** WHO's fact sheet and Q&A pages show the table only as an image, and WHO IRIS refused automated access. These values stay provisional. To verify them yourself, open the executive summary on iris.who.int and update `health-library.json`.

## Tried, not confirmed

These stay provisional:

- Purifiers: Xiaomi (mi.com returned 403), Levoit and Blueair (rate-limited), Coway (Korean site, no product page found), Samsung (no product page), and Philips AC1215, AC0920 and AC2887 (not on the listing pages read).
- The Delhi electricity tariff (DERC), bus and metro fares, indoor model factors and emission factors were not researched in this pass.
