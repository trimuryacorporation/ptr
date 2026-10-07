import {z} from 'zod';
const mobile=z.string().regex(/^\+?\d{6,15}$/);
export function loginCredentials(body){
 const data=z.object({identifier:z.string().trim().min(1).optional(),email:z.string().trim().optional(),password:z.string().min(1)}).parse(body);
 const identifier=data.identifier??data.email??'';
 const query=identifier.includes('@')?{email:z.string().email().parse(identifier.toLowerCase())}:{mobile:mobile.parse(identifier.replace(/[\s()-]/g,''))};
 return {query,password:data.password};
}
