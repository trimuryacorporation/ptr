import {z} from 'zod';
export const literalSearch=value=>[...value].map(char=>'.*+?^$\{\}()|[]\\'.includes(char)?'\\'+char:char).join('');
export function staffFilters(query,role){const filter={role,deletedAt:null};if(query.status)filter.status=z.enum(['verified','blocked']).parse(query.status);if(query.search){const text=literalSearch(z.string().trim().max(100).parse(query.search));filter.$or=['fullName','email','vendorCode'].map(key=>({[key]:{$regex:text,$options:'i'}}));if(/^VND-[A-F0-9]{24}$/i.test(query.search))filter.$or.push({_id:query.search.slice(4)})}return filter}
