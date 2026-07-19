export type Service = {
  title: string;
  icon: string;
  shortDescription: string;
  description: string;
  deliverables: string[];
  suitableFor: string[];
};

export const services: Service[] = [
  {
    title: "Cloud and Server Infrastructure", icon: "◫",
    shortDescription: "Build secure, maintainable infrastructure for hosting and operating applications.",
    description: "Design and configure practical infrastructure for deploying and operating applications securely and reliably.",
    deliverables: ["Linux server provisioning and hardening", "AWS, GCP, or cloud VM setup", "Network, firewall, DNS, and domain configuration", "NGINX, SSL, Docker, and reverse proxy configuration", "Development, preview, and production environments", "Backup, recovery, troubleshooting, and documentation"],
    suitableFor: ["Deploying an application to a new server", "Moving from a platform service to a dedicated VM", "Configuring separate preview and production environments", "Repairing unreliable server or reverse proxy configurations"],
  },
  {
    title: "CI/CD and Deployment Automation", icon: "↻",
    shortDescription: "Replace manual releases with repeatable, traceable, and safer deployment workflows.",
    description: "Automate software delivery so releases become repeatable, traceable, and less dependent on manual server work.",
    deliverables: ["GitHub Actions workflows and GitLab CI/CD pipelines", "Build, test, deployment, and Docker registry workflows", "SSH-based deployment automation where appropriate", "Environment-specific secrets and configuration", "Preview, staging, and production deployment flows", "Verification, rollback procedures, and documentation"],
    suitableFor: ["Replacing manual SSH and deployment steps", "Introducing automated deployments for an existing application", "Separating preview and production releases", "Diagnosing failed or unreliable pipelines"],
  },
  {
    title: "Kubernetes and OpenShift Support", icon: "⎈",
    shortDescription: "Deploy and operate containerised workloads on Kubernetes and OpenShift platforms.",
    description: "Deploy, configure, and troubleshoot containerised workloads running on Kubernetes or OpenShift.",
    deliverables: ["Deployment, StatefulSet, Service, Route, and Ingress configuration", "ConfigMaps, Secrets, resource limits, and health probes", "Persistent storage and network policy configuration", "Application monitoring and backup integration", "Deployment and runtime troubleshooting", "Operational documentation and handover"],
    suitableFor: ["Deploying applications to Kubernetes or OpenShift", "Troubleshooting failing workloads", "Configuring storage, networking, or routes", "Improving the operational readiness of an existing deployment"],
  },
  {
    title: "Monitoring and Reliability", icon: "⌁",
    shortDescription: "Improve operational visibility and detect infrastructure or application problems earlier.",
    description: "Implement operational visibility so infrastructure and application problems can be detected, investigated, and resolved more effectively.",
    deliverables: ["Prometheus configuration and Grafana dashboards", "Infrastructure, application, availability, and database metrics", "Alert rules and backup monitoring", "Log collection guidance", "Incident investigation and root-cause analysis", "Monitoring documentation and handover"],
    suitableFor: ["Adding monitoring to an existing application or server", "Creating useful dashboards for operational teams", "Detecting recurring infrastructure failures", "Improving backup and service-health visibility"],
  },
];
