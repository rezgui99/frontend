"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      AuditLog.belongsTo(models.User, {
        foreignKey: "modified_by",
        as: "modifier"
      });
    }
  }

  AuditLog.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      action: {
        type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'ROLE_ASSIGN', 'ROLE_REMOVE', 'ACTIVATE', 'DEACTIVATE'),
        allowNull: false
      },
      table_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      record_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      old_values: {
        type: DataTypes.JSON,
        allowNull: true
      },
      new_values: {
        type: DataTypes.JSON,
        allowNull: true
      },
      modified_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "AuditLog",
      tableName: "AuditLogs",
    }
  );

  return AuditLog;
};