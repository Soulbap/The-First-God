# Ressurs- og industrikjeder

Dette er spillabstraksjoner, ikke komplette historiske oppskrifter. Ressurser simuleres individuelt bare når plassering, knapphet eller transport gir et forståelig valg.

| Klasse | Eksempler | Simuleringsnivå / fasilitet | Transport og energi |
|---|---|---|---|
| Fornybar råvare | Tre, mat, vann, fiber | Individuelt tidlig; skog, åker, brønn. | Bæring/kjerre; menneske-, dyre- eller mekanisk kraft. |
| Byggemateriale | Stein, leire, sand/glass, kalk | Stein individuelt nå; annet grupperes etter behov. Brudd, ovn, glassverk. | Tung last favoriserer lokale forekomster, elv/jernbane. |
| Malm og metall | Kobber, tinn, jernmalm, bronse, jern, stål | Forekomster individuelt når handel starter; metallvarer kan grupperes sent. | Krever brensel/reduktant og varme. |
| Energi/drivstoff | Ved, kull, petroleum, raffinert drivstoff | Kilder individuelt; strøm er kapasitet/nettdekning, ikke beholdning. | Kilde → konvertering → distribusjon → forbruk. |
| Høyverdi mellomvare | Ledere, kjemi, presisjonsdeler, elektronikk | Grupperte vareklasser, ikke hundre enkeltstoffer. | Fabrikk-/labnett og stabil energi. |
| Romvare | Propellant, romfartøykomponenter | Få, tydelige programressurser. | Romhavn og kvalifisert logistikk. |

```text
kobber + tinn + varme -> bronse
jernmalm + reduktant/brensel + ovn -> jern -> kontrollert behandling -> stål
kull + vann + kjele/maskin -> dampdrevet arbeid
vann|vind|damp|motor + generator -> elektrisitet -> ledning -> maskin/lys
råolje -> raffinering -> drivstoff
kjemigruppe + produksjon -> rakettpropellant
metall/legering + presisjon + elektronikk -> romfartøykomponenter
```

## Regler, flaskehalser og kontroll

- Ingen verkstedtype produserer fysisk råstoff fra ingenting. Et tydelig abstrahert input må være dokumentert.
- Tidlig økonomi er lokal og fornybar; sent spill flytter flaskehalser til energi, kapasitet, kvalitet og lang transport.
- Forekomster kan tømmes eller gi synkende utbytte. Skog/mark kan regenerere innenfor synlige grenser. Manglende lokal ressurs gir handel, substitusjon eller langsommere utvikling — aldri vilkårlig tap.
- Substitusjon: tre/stein avlaster tidlig bygg; vann, vind og damp leverer mekanisk input; flere generatorformer kan gi strøm. Dette unngår historiske tvangskjeder, men ikke fysiske krav.
- Regional spesialisering oppstår når en bosetting har forekomst, nettverk og kapasitet; varer fraktes fysisk eller som aggregert rutevolum når avstanden blir stor.

Test bronse/jern med regional handel og mangelsignal; test damp med hver input av/på og transporttid; test strøm som tre ledd (generator, nett, forbruk); prototyp én gruppert kjemikjede før den deles; test at rakettprogram faktisk blokkeres av metall, energi, kjemi, presisjon og elektronikk. Grupper tekstiler som «fibervarer», reagenser som «industrikjemi» og småkomponenter som «presisjonsdeler» der det bevarer lesbarheten.
