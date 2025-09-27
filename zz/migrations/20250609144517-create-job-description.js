"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("JobDescriptions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      emploi: {
        type: Sequelize.STRING,
      },
      filiere_activite: {
        type: Sequelize.STRING,
      },
      famille: {
        type: Sequelize.STRING,
      },
      superieur_n1: {
        type: Sequelize.INTEGER,
        references: {
          model: "JobDescriptions",
          key: "id",
        },
        allowNull: true,
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      superieur_n2: {
        type: Sequelize.INTEGER,
        references: {
          model: "JobDescriptions",
          key: "id",
        },
        allowNull: true,
        onDelete: "SET NULL",
        onUpdate: "CASCADE",
      },
      finalite: {
        type: Sequelize.TEXT,
      },
      niveau_exigence: {
        type: Sequelize.STRING,
      },
      niveau_exp: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.STRING,
      },
      version: {
        type: Sequelize.STRING,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      validatedAt: {
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("JobDescriptions");
  },
};
