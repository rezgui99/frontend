-
/*
  # Add department field to employees

  1. New Columns
    - `department` (text) - Department/filiere_activite for analytics
  
  2. Purpose
    - Enable department-based analytics and filtering
    - Link employees to organizational departments
*/

'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Employees', 'department', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Department or filiere_activite for analytics'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Employees', 'department');
  }
};