import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '../../services/employee.service';
import { JobDescriptionService } from '../../services/job-description.service';
import { Employee } from '../../models/employee.model';
import { JobDescription } from '../../models/job-description.model';

interface OrgNode {
  id: number;
  name: string;
  position: string;
  email: string;
  children: OrgNode[];
  level: number;
}

@Component({
  selector: 'app-organigramme',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './organigramme.component.html',
  styleUrls: ['./organigramme.component.css']
})
export class OrganigrammeComponent implements OnInit {
  employees: Employee[] = [];
  jobDescriptions: JobDescription[] = [];
  orgChart: OrgNode[] = [];
  loading: boolean = true;
  errorMessage: string | null = null;

  constructor(
    private employeeService: EmployeeService,
    private jobDescriptionService: JobDescriptionService
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = null;

    Promise.all([
      this.employeeService.getEmployees().toPromise(),
      this.jobDescriptionService.getJobDescriptions().toPromise()
    ]).then(([employees, jobDescriptions]) => {
      this.employees = employees || [];
      this.jobDescriptions = jobDescriptions || [];
      this.buildOrgChart();
      this.loading = false;
    }).catch(err => {
      console.error('Error loading organizational data:', err);
      this.errorMessage = 'Erreur lors du chargement des données organisationnelles.';
      this.loading = false;
    });
  }

  buildOrgChart(): void {
    // Créer une map des fiches de poste avec leurs relations hiérarchiques
    const jobMap = new Map<number, JobDescription>();
    this.jobDescriptions.forEach(job => {
      if (job.id) {
        jobMap.set(job.id, job);
      }
    });

    // Créer une map des employés par poste
    const employeesByPosition = new Map<string, Employee[]>();
    this.employees.forEach(emp => {
      const position = emp.position;
      if (!employeesByPosition.has(position)) {
        employeesByPosition.set(position, []);
      }
      employeesByPosition.get(position)!.push(emp);
    });

    // Construire l'organigramme basé sur les relations hiérarchiques des fiches de poste
    const rootNodes: OrgNode[] = [];
    const processedJobs = new Set<number>();

    // Trouver les postes de direction (sans supérieur)
    this.jobDescriptions.forEach(job => {
      if (job.id && !job.superieur_n1 && !processedJobs.has(job.id)) {
        const node = this.createOrgNode(job, employeesByPosition, jobMap, processedJobs, 0);
        if (node) {
          rootNodes.push(node);
        }
      }
    });

    // Si aucun poste de direction n'est trouvé, créer des nœuds pour tous les postes
    if (rootNodes.length === 0) {
      this.jobDescriptions.forEach(job => {
        if (job.id && !processedJobs.has(job.id)) {
          const node = this.createOrgNode(job, employeesByPosition, jobMap, processedJobs, 0);
          if (node) {
            rootNodes.push(node);
          }
        }
      });
    }

    this.orgChart = rootNodes;
  }

  createOrgNode(
    job: JobDescription, 
    employeesByPosition: Map<string, Employee[]>,
    jobMap: Map<number, JobDescription>,
    processedJobs: Set<number>,
    level: number
  ): OrgNode | null {
    if (!job.id || processedJobs.has(job.id)) {
      return null;
    }

    processedJobs.add(job.id);

    // Trouver les employés pour ce poste
    const employeesForJob = employeesByPosition.get(job.emploi) || [];
    
    // Créer un nœud pour chaque employé ou un nœud générique si aucun employé
    if (employeesForJob.length > 0) {
      // Prendre le premier employé comme représentant du poste
      const mainEmployee = employeesForJob[0];
      const node: OrgNode = {
        id: job.id,
        name: mainEmployee.name,
        position: job.emploi,
        email: mainEmployee.email,
        children: [],
        level: level
      };

      // Trouver les postes subordonnés
      this.jobDescriptions.forEach(subordinateJob => {
        if (subordinateJob.superieur_n1 === job.id || subordinateJob.superieur_n2 === job.id) {
          const childNode = this.createOrgNode(subordinateJob, employeesByPosition, jobMap, processedJobs, level + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      });

      return node;
    } else {
      // Créer un nœud générique pour le poste sans employé assigné
      const node: OrgNode = {
        id: job.id,
        name: 'Poste vacant',
        position: job.emploi,
        email: '',
        children: [],
        level: level
      };

      // Trouver les postes subordonnés
      this.jobDescriptions.forEach(subordinateJob => {
        if (subordinateJob.superieur_n1 === job.id || subordinateJob.superieur_n2 === job.id) {
          const childNode = this.createOrgNode(subordinateJob, employeesByPosition, jobMap, processedJobs, level + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      });

      return node;
    }
  }

  getNodeClass(level: number): string {
    const classes = [
      'level-0', // Direction
      'level-1', // Management
      'level-2', // Superviseurs
      'level-3', // Employés
      'level-4'  // Stagiaires/Juniors
    ];
    return classes[Math.min(level, classes.length - 1)];
  }
}