"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert("Roles", [
      {
        name: "admin",
        description: "Administrateur système avec tous les droits",
        permissions: JSON.stringify([
          "user.create", "user.read", "user.update", "user.delete",
          "role.assign", "role.remove", "role.read",
          "skill.create", "skill.read", "skill.update", "skill.delete",
          "job.create", "job.read", "job.update", "job.delete",
          "employee.create", "employee.read", "employee.update", "employee.delete",
          "audit.read", "system.manage"
        ]),
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: "hr",
        description: "Responsable RH avec droits de gestion des employés et fiches de poste",
        permissions: JSON.stringify([
          "employee.create", "employee.read", "employee.update", "employee.delete",
          "job.create", "job.read", "job.update", "job.delete",
          "skill.read", "matching.perform", "reports.view"
        ]),
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
     
     
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Roles", null, {});
  },
}