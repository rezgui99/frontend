"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Employees", "profile_picture", {
      type: Sequelize.STRING,
      allowNull: true, // peut être null si l'employé n'a pas encore d'image
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Employees", "profile_picture");
  },
};
