require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require('path');
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
let db;
try {
  db = require("./models"); // ← récupère l’unique instance Sequelize
} catch (e) {
  console.error("❌ Erreur lors du chargement des modèles :", e.message);
  process.exit(1);
}

const jobDescriptionRoutes = require("./src/routes/jobdescription");
const linkedinRoutes = require("./src/routes/linkedin");
const moyenRoutes = require("./src/routes/moyen");
const employeeRoutes = require("./src/routes/employee"); 
const skillRoutes = require("./src/routes/skill"); 
const skilltypeRoutes = require("./src/routes/skilltype"); 
const skilllevelRoutes = require("./src/routes/skilllevel"); 
const employeeskillRoutes = require("./src/routes/employeeskill"); 
const jobrequiredskillRoutes = require("./src/routes/jobrequiredskill"); 
const swaggerDocument = YAML.load("./swagger.yaml");
const jobEmployeeSkillMatchRoutes = require("./src/routes/jobemployeeskillmatch");
const authRoutes = require("./src/routes/auth");
const userManagementRoutes = require("./src/routes/userManagement");
const jobOfferRoutes = require("./src/routes/joboffer");
 const analyticsRoutes = require("./src/routes/analytics");
const { authenticateToken } = require("./src/middleware/auth");

// Routes candidats
const candidateAuthRoutes = require("./src/routes/candidateAuth");
const candidateCVRoutes = require("./src/routes/candidateCV");
const candidateApplicationRoutes = require("./src/routes/candidateApplications");
const candidateFavoritesRoutes = require("./src/routes/candidateFavorites");
const publicJobOffersRoutes = require("./src/routes/publicJobOffers");
const recruiterApplicationsRoutes = require("./src/routes/recruiterApplications");
const recommendationRoutes = require('./src/routes/recommendations');

// Routes entretiens
const interviewRoutes = require("./src/routes/interviews");




const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:4200', // Votre frontend Angular
  credentials: true
}));
app.get("/", (req, res) =>
  res.json({ status: "Matchnhire backend node ", version: "v1" })
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/jobdescriptions", jobDescriptionRoutes);
app.use("/api/linkedin", linkedinRoutes);
app.use("/api/moyens", moyenRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/skilltypes", skilltypeRoutes);
app.use("/api/skilllevels", skilllevelRoutes);
app.use("/api/employeeskills", employeeskillRoutes);
app.use("/api/jobrequiredskills", jobrequiredskillRoutes);
app.use("/api/jobemployeeskillmatch", jobEmployeeSkillMatchRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", userManagementRoutes);
app.use("/api/job-offers", jobOfferRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// Routes candidats
app.use("/api/candidate/auth", candidateAuthRoutes);
app.use("/api/candidate/cvs", candidateCVRoutes);
app.use("/api/candidate/applications", candidateApplicationRoutes);
app.use("/api/candidate/favorites", candidateFavoritesRoutes);
app.use("/api/public/job-offers", publicJobOffersRoutes);
app.use("/api/recruiter/applications", recruiterApplicationsRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Routes entretiens
app.use("/api/interviews", authenticateToken, interviewRoutes);

// 404 - Route non trouvée
app.use((req, res, next) => {
  res.status(404).json({ error: "Route not found" });
});

// Middleware global d’erreur
app.use((err, req, res, next) => {
  console.error("❌ Erreur serveur :", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// ─── Connexion & synchronisation ──────────────────────────────────────────────
(async () => {
  try {
    await db.sequelize.authenticate();
    console.log("✅ DB connection OK");

    await db.sequelize.sync(); // ou sync({ alter: true }) / { force: true }
    console.log("✅ Models synced");

    app.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ Unable to connect to the DB:", err.message);
    process.exit(1);
  }
})();
