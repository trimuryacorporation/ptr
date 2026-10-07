import jwt from 'jsonwebtoken';
export const signAccess = user => jwt.sign({id:user._id,role:user.role},process.env.JWT_ACCESS_SECRET,{expiresIn:process.env.ACCESS_TOKEN_TTL||'15m'});
export const signRefresh = user => jwt.sign({id:user._id,role:user.role},process.env.JWT_REFRESH_SECRET,{expiresIn:process.env.REFRESH_TOKEN_TTL||'7d'});
export const auth = (roles=[]) => (req,res,next) => { try { const token=req.headers.authorization?.split(' ')[1]; const payload=jwt.verify(token,process.env.JWT_ACCESS_SECRET); req.user=payload; if(roles.length&&!(roles.includes(payload.role)||(payload.role==='super_admin'&&roles.includes('admin')))) return res.status(403).json({message:'Insufficient permissions'}); next(); } catch { res.status(401).json({message:'Authentication required'}); } };
export const cookieOptions={httpOnly:true,secure:process.env.COOKIE_SECURE==='true',sameSite:'lax',path:'/api/auth'};
