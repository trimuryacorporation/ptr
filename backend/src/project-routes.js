import express from 'express';
import {auth} from './auth.js';
import {Project,Script,PairingQueue,PairingMatch,RecordingSession,AuditLog} from './models.js';

const router=express.Router();
router.delete('/projects/:id',auth(['admin']),async(req,res)=>{
 if(!/^[a-f\d]{24}$/i.test(req.params.id))return res.status(400).json({message:'Invalid project ID.'});
 const project=await Project.findById(req.params.id);
 if(!project)return res.status(404).json({message:'Project not found.'});
 const linked=await Promise.all([Script,PairingQueue,PairingMatch,RecordingSession].map(model=>model.exists({project:project._id})));
 if(linked.some(Boolean))return res.status(409).json({message:'This project has linked scripts or recording activity. Edit the project and mark it inactive instead.'});
 await Project.deleteOne({_id:project._id});
 await AuditLog.create({actor:req.user.id,action:'DELETE_PROJECT',entity:'Project',entityId:project._id,details:{name:project.name}});
 res.json({message:'Project deleted successfully.'});
});
export default router;
