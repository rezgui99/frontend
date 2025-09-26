'use strict';

/*
  # Add contact_phone column to interviews

  1. New Columns
    - `contact_phone` (string, nullable) - Phone number for phone interviews
  
  2. Purpose
    - Support phone interviews with contact information
    - Allow storing phone number for phone-based interviews
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Interviews', 'contact_phone', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Phone number for phone interviews'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Interviews', 'contact_phone');
  }
};