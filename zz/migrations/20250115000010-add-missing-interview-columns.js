'use strict';

/*
  # Add missing columns to interviews table

  1. New Columns
    - `timezone` (string, nullable) - Timezone for the interview
    - `starts_at_utc` (date, nullable) - UTC start time
    - `ends_at_utc` (date, nullable) - UTC end time
    - `reminder_sent` (boolean, default false) - Whether reminder was sent
  
  2. Purpose
    - Fix 500 errors on interview routes
    - Support timezone-aware scheduling
    - Track reminder notifications
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add timezone column
    await queryInterface.addColumn('Interviews', 'timezone', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Europe/Paris',
      comment: 'Timezone for the interview'
    });

    // Add starts_at_utc column
    await queryInterface.addColumn('Interviews', 'starts_at_utc', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'UTC start time for the interview'
    });

    // Add ends_at_utc column
    await queryInterface.addColumn('Interviews', 'ends_at_utc', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'UTC end time for the interview'
    });

    // Add reminder_sent column if it doesn't exist
    try {
      await queryInterface.addColumn('Interviews', 'reminder_sent', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether reminder notification was sent'
      });
    } catch (error) {
      // Column might already exist, ignore error
      console.log('reminder_sent column might already exist:', error.message);
    }

    // Update existing records to have proper UTC times based on scheduled_date
    await queryInterface.sequelize.query(`
      UPDATE "Interviews" 
      SET 
        starts_at_utc = scheduled_date,
        ends_at_utc = scheduled_date + INTERVAL '1 hour' * duration_minutes / 60,
        timezone = COALESCE(timezone, 'Europe/Paris'),
        reminder_sent = COALESCE(reminder_sent, false)
      WHERE starts_at_utc IS NULL OR ends_at_utc IS NULL
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Interviews', 'timezone');
    await queryInterface.removeColumn('Interviews', 'starts_at_utc');
    await queryInterface.removeColumn('Interviews', 'ends_at_utc');
    // Note: reminder_sent might have been added in a previous migration, so we don't remove it
  }
};