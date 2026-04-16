# Epics – Mechanik

## EPIC-01: Vehicle Management

### Description
Handles all vehicle-related operations within a business including vehicle registration, listing, and access to vehicle service history.

### Scope
- Vehicle creation (register new vehicle)
- Vehicle listing and search
- Vehicle detail view
- Access to service history per vehicle

### User Stories
- As a service advisor, I want to register a vehicle so that I can track its service history.
- As a user, I want to view a list of vehicles so that I can find records quickly.
- As a user, I want to view vehicle details so that I can see service history and past operations.

### Business Rules
- Plate number must be unique within a business
- Vehicle must belong to a business (multi-tenant structure)
- Only authorized users can access vehicle data

### High-Level Flow
1. User accesses vehicle module
2. System displays vehicle list or entry form
3. User creates or selects a vehicle
4. System validates input and permissions
5. System saves or retrieves vehicle data
6. System displays confirmation or details

### Edge Cases
- Duplicate plate number entry
- Vehicle not found
- Missing or incomplete vehicle data
- Unauthorized access attempt

## EPIC-02: Customer Management

### Description
This epic covers the management of customer data within the system. Customers are linked to vehicles and service operations, enabling workshops to maintain structured customer records and improve service traceability and communication.

### Scope
- Customer name capture during vehicle creation (no standalone customer creation module)
- Customer listing and search
- Customer detail view
- Linking customers to vehicles
- Viewing customer-related service history

### User Stories
- As a service advisor, I want to capture customer name during vehicle creation so that I can associate vehicles with customers without managing separate customer records.
- As a user, I want to view a list of customers so that I can quickly access customer records.
- As a user, I want to view customer details so that I can see associated vehicles and service history.
- As a service advisor, I want to search customers so that I can find records efficiently.

### Business Rules
- Customer entity is not managed as a separate module; it is created implicitly during vehicle creation
- Each customer must belong to a business (multi-tenant structure)
- A customer can have multiple vehicles
- Customer data must only be accessible by authorized users within the same business

### Edge Cases
- Vehicle created without customer name (optional field missing)
- Customer exists but has no linked vehicles
- Customer has multiple vehicles with no service history
- Unauthorized access to another business’s customer data

### Acceptance Criteria
- Customer name can be optionally captured during vehicle creation
- If customer name is provided, it is associated with the created vehicle record
- If customer name is not provided, vehicle creation is still allowed and system must handle null/empty customer reference gracefully
- Customer data is scoped per business (multi-tenant isolation enforced)
- Customer information is retrievable only through associated vehicle records (no standalone customer module access)
- System must display customer name consistently in vehicle detail and vehicle list views when available

## EPIC-03: Service Management

### Description
This epic covers the full lifecycle of vehicle service operations within a workshop system. It enables creation, tracking and management of service records linked to vehicles, including labor, parts, cost breakdown, and service status progression.

### Scope
- Create service record for a vehicle
- Track service status (e.g., Open, In Progress, Completed)
- Record labor cost and parts cost
- View service history per vehicle
- Update service status during lifecycle
- Access service details from vehicle detail page

### User Stories
- As a service advisor, I want to create a service record for a vehicle so that I can track maintenance work.
- As a user, I want to update service status so that I can reflect real-time progress of work.
- As a user, I want to view service history so that I can understand past maintenance performed on a vehicle.
- As a service advisor, I want to record labor and parts costs so that I can track service profitability.

### Business Rules
- Each service record must be linked to a single vehicle
- Service records must belong to a business (multi-tenant structure)
- Service status must follow predefined states (Open → In Progress → Completed)
- Labor cost and parts cost must be numeric and non-negative
- Service history must be immutable once marked as Completed (no deletion allowed)

### Edge Cases
- Service created for non-existent vehicle
- Attempt to update a completed service record
- Missing cost information during service creation
- Large number of service records affecting performance
- Unauthorized access to another business’s service data

### Acceptance Criteria
- User can create a service record only for existing vehicles
- Service status must be selectable from allowed predefined states
- System must calculate and store labor and parts cost separately
- Completed service records cannot be deleted or modified
- Service history must be retrievable from vehicle detail page
- System must enforce business-level data isolation for all service records

## EPIC-04: Authentication & Authorization

### Description
This epic covers user authentication, authorization, role-based access control, and strict business-level data isolation across the system. It ensures that only authenticated and authorized users can access modules and data belonging to their own business.

### Scope
- User login and logout
- Session management
- Role-based access control (RBAC)
- Module-level access permissions (Vehicle, Customer, Service, Reports)
- Business-level data isolation enforcement (multi-tenant security)
- Access denied handling and redirection

### User Stories
- As a user, I want to log into the system so that I can access my business data securely.
- As a business owner, I want to control user roles so that I can manage access to system modules.
- As a user, I want to only see data belonging to my business so that sensitive information is protected.
- As a system, I want to block unauthorized access attempts so that data integrity is maintained.

### Business Rules
- Each user must belong to exactly one business (tenant)
- Authentication is required for all system access
- Users are assigned roles (e.g., Owner, Service Advisor, Technician)
- Access to modules is determined by role-based permissions
- Cross-business data access is strictly prohibited
- Unauthorized access attempts must be logged and denied

### Edge Cases
- Invalid login credentials
- Expired or invalid session token
- User with no assigned role
- Attempt to access modules without permission
- Cross-tenant data access attempt
- Session timeout during active usage

### Acceptance Criteria
- User cannot access any module without successful authentication
- System must restrict module visibility based on user role
- Users can only access data belonging to their assigned business
- Unauthorized access attempts must return an access denied response
- Session expiration must force re-authentication

## EPIC-05: Business Reporting

### Description
This epic covers business-level reporting and analytics capabilities that provide operational and financial visibility for workshop owners. It transforms raw service and vehicle data into meaningful performance indicators.

### Scope
- Revenue overview and breakdown (labor vs parts)
- Service volume tracking (daily, weekly, monthly trends)
- Vehicle activity insights (most serviced vehicles, inactive vehicles)
- Business performance KPIs
- Basic dashboard visualization of operational metrics

### User Stories
- As a business owner, I want to view revenue breakdown so that I can understand profitability sources.
- As a user, I want to see service trends so that I can monitor workshop activity over time.
- As a business owner, I want to identify high-activity vehicles so that I can prioritize customer engagement.
- As a user, I want to access a dashboard so that I can quickly understand business performance.

### Business Rules
- All reports must be scoped to a single business (multi-tenant isolation enforced)
- Revenue calculations must be derived from service records only
- Labor and parts revenue must be displayed separately and not mixed
- Report data must be read-only (no modification from reporting layer)
- Metrics must reflect only completed service records unless otherwise specified

### Edge Cases
- No service data available for reporting period
- Large dataset causing performance delays in report generation
- Partial or inconsistent service cost data
- Unauthorized access to reporting data from another business
- Zero revenue periods (inactive workshop periods)

### Acceptance Criteria
- System must display revenue breakdown separating labor and parts
- System must generate service trend views for selected time ranges
- Reports must only include data belonging to the authenticated business
- Dashboard must load without modification capabilities (read-only view)
- System must handle empty datasets gracefully without errors
- KPI calculations must be consistent with underlying service records