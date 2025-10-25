import express , { Router } from 'express';
import { userRegistration } from '../controller/auth.controller';

const router:Router = express.Router();

// Define your routes here
router.post("/user-registration", userRegistration)

export default router;      