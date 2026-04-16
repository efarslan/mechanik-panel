## TC-XM-01 – Vehicle to Service Full Flow

### Preconditions:
- User is authenticated
- User belongs to a business (tenant)
- At least one vehicle exists in Vehicle List

---

### Test Steps:
1. Navigate to Vehicle Module
2. Open Vehicle List
3. Select an existing vehicle
4. Open Vehicle Detail page
5. Click "Add Service / New Job"
6. Fill service form:
   - Job Title
   - Mileage
   - Optional itemized work entries
7. Save service record

---

### Expected Result:
- Service record is successfully created
- System correctly links Service → Vehicle (VehicleID reference exists)
- Newly created service appears immediately in:
  - Vehicle Detail → Service History section
  - Service Module → Service List
- No data mismatch between Vehicle and Service modules
- Cost calculation (if applicable) is consistent in both views

---

### Validation Points:
- Vehicle ID integrity is preserved in Service record
- Tenant isolation is enforced (no cross-business data leakage)
- Service is visible only within same business scope
- UI reflects updated state without manual refresh

---

### Edge Cases:
- Vehicle deleted after service creation → Service still exists but shows fallback vehicle info
- Duplicate service submission → prevented
- Network delay during save → no duplicate records created

---

### Status:
- Not Executed (Design Level Test Case)

---

## TC-XM-02 – Data Integrity (Vehicle ↔ Service Consistency)

### Preconditions:
- User is authenticated
- User belongs to a business (tenant)
- At least one vehicle exists
- At least one service exists for that vehicle

---

### Test Steps:
1. Navigate to Vehicle Module
2. Open Vehicle Detail page
3. Verify service history section
4. Navigate to Service Module
5. Open Service List
6. Select a service linked to the same vehicle
7. Open Service Detail page

---

### Expected Result:
- Vehicle Detail service history matches Service Module records
- Service data (Job Title, Mileage, Date) is identical in both views
- No missing or duplicated service entries between modules
- Calculated values (if shown) are consistent across both modules

---

### Validation Points:
- Vehicle ↔ Service relationship consistency is maintained
- No orphaned or mismatched records exist
- UI displays same source of truth across modules

---

### Edge Cases:
- Service exists but vehicle data updated → system reflects latest consistent snapshot
- Partial service data corruption → system fails gracefully without breaking UI

---

### Status:
- Not Executed (Design Level Test Case)

---

## TC-XM-03 – Tenant Isolation / Permission Enforcement

### Preconditions:
- User is authenticated
- System contains multiple businesses (tenants)
- Each tenant has separate vehicles and services

---

### Test Steps:
1. Attempt to access Vehicle List
2. Verify only current business vehicles are shown
3. Attempt to access Service List
4. Verify only current business services are shown
5. Attempt direct access to a Vehicle/Service ID from another tenant (if URL known)

---

### Expected Result:
- User can only see data belonging to their own business
- Cross-tenant data is never visible in UI
- Direct URL access to other tenant data is blocked (403 or Not Found)
- No data leakage occurs in API responses

---

### Validation Points:
- Tenant isolation enforced at API level
- UI does not expose foreign business IDs
- Backend authorization is strict and consistent

---

### Edge Cases:
- Cached data from previous tenant session → must not be displayed
- Manipulated request parameters → must be rejected by backend

---

### Status:
- Not Executed (Design Level Test Case)