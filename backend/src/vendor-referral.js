import {z} from 'zod';
import {User} from './models.js';
export const displayVendorCode=user=>user.vendorCode||(user.role==='vendor'?'VND-'+String(user._id).toUpperCase():undefined);
export async function resolveVendorCode(value){
 const code=String(value||'').trim().toUpperCase();if(!code)return null;
 if(!/^VND-[A-F0-9]{24}$/.test(code)){z.string().refine(()=>false,'Invalid vendor code.').parse(code)}
 const vendor=await User.findOne({role:'vendor',status:'verified',deletedAt:null,$or:[{vendorCode:code},{_id:code.slice(4).toLowerCase()}]}).select('_id');
 if(!vendor){z.string().refine(()=>false,'Vendor code is invalid or inactive.').parse(code)}return vendor._id;
}
