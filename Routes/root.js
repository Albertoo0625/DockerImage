const express=require('express');
const router=express.Router();
const controller=require('../Controllers/rootController')

router.route('/')
.get(controller.handleRoot);

module.exports=router;