import {Topic} from './models.js';
export const defaultTopics=['Education','Banking','Financial','Insurance','Retail','e-commerce','Healthcare','Hospitality','Manufacturing','Logistics','warehousing','Construction','Agriculture','Automotive services'];
export const topicKey=name=>name.trim().toLowerCase().replace(/\s+/g,' ');
export async function seedTopics(){await Topic.bulkWrite(defaultTopics.map(name=>({updateOne:{filter:{key:topicKey(name)},update:{$setOnInsert:{name,key:topicKey(name),enabled:true}},upsert:true}})))}
