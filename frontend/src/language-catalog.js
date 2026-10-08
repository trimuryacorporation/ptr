// Saved reference suggestions; census mother-tongue groupings are not a
// definitive linguistic classification. Custom project terminology is allowed.
export const catalogSources=[
 {title:'LDC-IL Kannada dialect reference',url:'https://ldcil.org/files/publication/LDCIL_Release_Documentation.pdf'},
 {title:'LDC-IL Malayalam regional varieties',url:'https://data.ldcil.org/ciil?order=ASC&page=4&sort=rating'},
 {title:'Telugu dialect research',url:'https://aclanthology.org/anthology-files/anthology-files/pdf/naacl/2022.naacl-srw.36.pdf'},
 {title:'CIIL language and mother-tongue list',url:'https://ciil.org/announcements/JobDescription_Hindi.pdf'},
 {title:'LDC-IL linguistic resources',url:'https://ldcil.org/files/publication/20210614_CompendiumBook.pdf'},
 {title:'Indic dialectology',url:'https://asian.washington.edu/sites/asian/files/documents/research/the_dialectology_of_indic.pdf'},
 {title:'Bengali dialects',url:'https://en.wikipedia.org/wiki/Bengali_dialects'},
 {title:'Punjabi dialects',url:'https://en.wikipedia.org/wiki/Punjabi_dialects'},
 {title:'Gujarati varieties',url:'https://en.wikipedia.org/wiki/Gujarati_language'},
 {title:'Assamese Kamrupi varieties',url:'https://en.wikipedia.org/wiki/Kamrupi_dialects'},
];
export const languageCatalog=[
 ['Assamese',['Kamrupi']],
 ['Bengali',['Rarhi','Vangiya','Kamrupi','Varendri']],
 ['Bodo',['Bodo/Boro','Kachari','Mech/Mechhia']],
 ['Dogri',[]],
 ['English',[]],
 ['Gujarati',['Surati','Kathiawari','Charotari','Pattani']],
 ['Hindi',['Khari Boli','Brajbhasha','Awadhi','Bundeli','Bagheli','Haryanvi','Bhojpuri','Chhattisgarhi','Marwari']],
 ['Kannada',['Mysuru Kannada','Dharwad Kannada','Mangaluru Kannada','Gulbarga Kannada']],
 ['Kashmiri',['Kishtwari','Siraji']],
 ['Konkani',['Malwani','Kudubi/Kudumbi']],
 ['Maithili',['Purbi Maithili','Thati']],
 ['Malayalam',['Travancore','Cochin','Malabar']],
 ['Manipuri',[]],
 ['Marathi',['Deshi','Varhadi','Jhadi Boli']],
 ['Nepali',[]],
 ['Odia',['Desia','Sambalpuri']],
 ['Punjabi',['Majhi','Malwai','Doabi','Puadhi']],
 ['Sanskrit',[]],
 ['Santali',['Karmali','Mahili']],
 ['Sindhi',['Bhatia','Kachchhi']],
 ['Tamil',['Central Tamil','Kongu Tamil','Madras Bashai','Madurai Tamil','Nellai Tamil','Kumari Tamil']],
 ['Telugu',['Telangana','Rayalaseema','Coastal Andhra']],
 ['Urdu',['Bhansari']],
].map(([language,dialects])=>({language,dialects:[`Standard ${language}`,...dialects]}));

export function languageSuggestions(projects=[]){
 return [...new Set([...languageCatalog.map(entry=>entry.language),...projects.flatMap(project=>(project.languages||[]).map(entry=>entry.language))])].sort((a,b)=>a.localeCompare(b));
}
export function dialectSuggestions(language,projects=[]){
 const normalized=language.trim().toLowerCase();
 if(!normalized)return [];
 return [...new Set([
  ...(languageCatalog.find(entry=>entry.language.toLowerCase()===normalized)?.dialects||[]),
  ...projects.flatMap(project=>(project.languages||[]).filter(entry=>entry.language.trim().toLowerCase()===normalized).flatMap(entry=>entry.dialects||[])),
 ])].sort((a,b)=>a.localeCompare(b));
}
