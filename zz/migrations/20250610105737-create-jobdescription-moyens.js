"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("JobDescriptionMoyens", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      jobDescriptionId: {
        type: Sequelize.INTEGER,
        references: { model: "JobDescriptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      moyenId: {
        type: Sequelize.INTEGER,
        references: { model: "Moyens", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("JobDescriptionMoyens");
  },
};
