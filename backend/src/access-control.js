import {auth} from './auth.js';
import {User} from './models.js';
export const permissionKeys=['candidates.read','recordings.read','recordings.download','reviews.read','reviews.decide','projects.read','topics.read','scripts.read','reports.read'];
export function normalizePermissions(values=[]){const result=new Set(values);if(result.has('reviews.decide'))result.add('reviews.read');if(result.has('recordings.download')||result.has('reviews.read'))result.add('recordings.read');return [...result]}
export const access=(permission,roles=['admin'])=>[auth(),async(req,res,next)=>{
 if(['vendor','reviewer'].includes(req.user.role)){
  const user=await User.findById(req.user.id).select('role status permissions');
  if(!user||user.role!==req.user.role||user.status!=='verified'||!user.permissions?.includes(permission))return res.status(403).json({message:'You do not have access to this feature. Contact your administrator.'});
  req.user.permissions=user.permissions;return next();
 }
 if(roles.includes(req.user.role)||(req.user.role==='super_admin'&&roles.includes('admin')))return next();
 return res.status(403).json({message:'Insufficient permissions'});
}];
