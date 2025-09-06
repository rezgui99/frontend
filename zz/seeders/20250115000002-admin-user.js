"use strict";
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Hash le mot de passe avant l'insertion
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await queryInterface.bulkInsert("Users", [
      {
        username: "admin",
        firstName: "Super",
        lastName: "Admin",
        email: "arezgui1999@gamil.com",
        password: hashedPassword, // Mot de passe hashé
        isActive: true,
        emailVerified: true,
        login_attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]);

    // Récupérer l'ID de l'utilisateur admin et du rôle admin
    const [adminUser] = await queryInterface.sequelize.query(
      "SELECT id FROM \"Users\" WHERE username = 'admin'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    const [adminRole] = await queryInterface.sequelize.query(
      "SELECT id FROM \"Roles\" WHERE name = 'admin'",
      { type: Sequelize.QueryTypes.SELECT }
    );

    // Attribuer le rôle admin à l'utilisateur admin
    if (adminUser && adminRole) {
      await queryInterface.bulkInsert("UserRoles", [
        {
          user_id: adminUser.id,
          role_id: adminRole.id,
          assigned_at: new Date(),
          assigned_by: adminUser.id, // Auto-assigné
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("UserRoles", null, {});
    await queryInterface.bulkDelete("Users", { username: "admin" }, {});
  },
};