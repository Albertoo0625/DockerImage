const express=require('express');
const router=express.Router();
const controller=require('../Controllers/postController')

router.route('/')
.get(controller.handlePostsRequest);

module.exports=router;