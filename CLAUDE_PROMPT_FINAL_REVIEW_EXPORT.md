# Claude Code Agent Prompt: Complete Final Review & Export Pages

## Project Context

**SeatHarmony** is an AI-powered wedding seating planner that uses Gurobi optimization and Tree-of-Thoughts (ToT) search to generate optimal seating arrangements. The system has a React/Vite frontend and FastAPI backend.

**Current Status:**
- ✅ Landing, Dashboard, Venue Selection, Recommendations, Planner AI pages are complete
- ⚠️ **Final Review (Confirmation)** and **Export** pages need completion

---

## Current State Analysis

### Confirmation Page (`frontend/pages/Confirmation.tsx`)
**What exists:**
- Visual floor plan with zoom controls
- Table details grid showing guests per table
- Sidebar with groups legend and summary stats
- PDF export button (basic implementation)
- Link to Export page

**What's missing:**
- Backend API endpoint for Excel export
- Backend API endpoint for high-quality PDF export
- Table-by-table guest list export
- Print-optimized layout
- Shareable link generation
- Edit/refinement capabilities from this page

### Export Dashboard Page (`frontend/pages/ExportDashboard.tsx`)
**What exists:**
- Success celebration UI with confetti
- Stats display (guests seated, tables, harmony score)
- Export settings checkboxes (not functional)
- Floor plan preview (basic)
- Modal for full-screen preview
- Button placeholders for Excel, PDF, Share

**What's missing:**
- **ALL backend endpoints** for export functionality
- Excel file generation with proper formatting
- PDF generation with high-res support
- Shareable link creation and management
- Vendor meal count summary
- Dietary restrictions column in Excel
- Print-ready PDF layout

---

## Required Backend Implementation

### 1. Excel Export Endpoint
**Route:** `POST /api/export/excel`

**Request Body:**
```python
class ExcelExportRequest(BaseModel):
    guests: List[GuestIn]
    tables: List[TableIn]
    layout: Dict[str, Any]  # Layout with assignments
    options: Dict[str, bool] = {
        "include_dietary": True,
        "include_vendor_summary": False,
        "include_table_details": True,
    }
```

**Response:** 
- Binary Excel file (`.xlsx`)
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

**Requirements:**
- **Sheet 1: "Seating Plan"** - Main table assignments
  - Columns: Guest Name | Table Name | Table Number | Group/Category | Dietary Restrictions | Notes
  - Sorted by table, then alphabetically
  - Color-coded by table
  
- **Sheet 2: "Table Summary"** (if `include_table_details=True`)
  - Columns: Table Name | Capacity | Guests Seated | Group Distribution | Zone
  - One row per table
  
- **Sheet 3: "Vendor Summary"** (if `include_vendor_summary=True`)
  - Columns: Category | Count | Dietary Notes
  - Aggregated meal counts for catering

- Use `openpyxl` library (already in requirements.txt)
- Apply professional formatting: headers bold, borders, alternating row colors
- Handle large guest lists (200+ guests) efficiently

### 2. PDF Export Endpoint
**Route:** `POST /api/export/pdf`

**Request Body:**
```python
class PDFExportRequest(BaseModel):
    guests: List[GuestIn]
    tables: List[TableIn]
    layout: Dict[str, Any]
    venue_layout: Optional[Dict[str, Any]]  # Venue visual config
    options: Dict[str, bool] = {
        "high_resolution": True,  # 300 DPI for printing
        "include_table_details": True,
        "include_legend": True,
    }
```

**Response:**
- Binary PDF file
- Content-Type: `application/pdf`

**Requirements:**
- **Page 1: Floor Plan**
  - Visual representation of venue with tables
  - Table numbers and guest counts
  - Color-coded by group/category
  - Legend for groups
  - High-resolution (300 DPI) for large format printing
  
- **Page 2+: Table Details** (if `include_table_details=True`)
  - One page per table (or multiple tables per page if small)
  - Guest names, group, dietary info
  - Table capacity and zone info

- Use `reportlab` or `weasyprint` library
- Support landscape orientation for floor plan
- Professional styling matching SeatHarmony design system

### 3. Shareable Link Endpoint
**Route:** `POST /api/export/share`

**Request Body:**
```python
class ShareRequest(BaseModel):
    guests: List[GuestIn]
    tables: List[TableIn]
    layout: Dict[str, Any]
    expires_in_days: int = 30
```

**Response:**
```python
{
    "share_id": "abc123...",
    "share_url": "https://seatharmony.com/share/abc123...",
    "expires_at": "2024-02-15T12:00:00Z"
}
```

**Requirements:**
- Generate unique share ID (UUID or short code)
- Store layout data in database or cache (Redis) with expiration
- Return shareable URL
- Optional: Add password protection

**GET Route:** `GET /api/export/share/{share_id}`
- Returns layout data for viewing (read-only)

---

## Required Frontend Implementation

### Confirmation Page Enhancements

1. **Excel Export Button**
   - Call `/api/export/excel` endpoint
   - Show loading state during generation
   - Download file with proper name: `SeatHarmony_SeatingPlan_[VenueName]_[Date].xlsx`
   - Handle errors gracefully

2. **Enhanced PDF Export**
   - Call `/api/export/pdf` endpoint
   - Support high-resolution option
   - Show preview before download
   - Download with name: `SeatHarmony_FloorPlan_[VenueName]_[Date].pdf`

3. **Edit/Refinement Capabilities**
   - "Edit Layout" button → Navigate back to Planner AI with current layout
   - Quick edit: Drag-and-drop guest reassignment (optional, nice-to-have)
   - Undo/Redo functionality

4. **Print Optimization**
   - "Print Layout" button
   - CSS print stylesheet for optimal printing
   - Hide UI elements, show only essential info
   - Page break handling for table details

5. **Shareable Link**
   - "Generate Share Link" button
   - Call `/api/export/share` endpoint
   - Display shareable URL with copy button
   - Show expiration date
   - QR code generation for easy sharing (optional)

### Export Dashboard Page Enhancements

1. **Functional Export Buttons**
   - **"Download Final Excel"** button:
     - Respects export settings checkboxes
     - Calls `/api/export/excel` with options
     - Shows progress indicator
     - Downloads file
  
   - **"Download PDF Map"** button:
     - Respects "High-Res for Printing" checkbox
     - Calls `/api/export/pdf` with options
     - Downloads high-quality PDF
  
   - **"Share Link"** button:
     - Calls `/api/export/share`
     - Opens modal with shareable URL
     - Copy to clipboard functionality
     - QR code display (optional)

2. **Export Settings Functionality**
   - Make checkboxes functional:
     - "Include Dietary Restrictions" → adds column to Excel
     - "Vendor Meal Count" → generates vendor summary sheet
     - "High-Res for Printing" → sets 300 DPI for PDF
   - Save preferences to localStorage
   - Apply settings to all export buttons

3. **Enhanced Preview Modal**
   - Full-screen floor plan with zoom/pan
   - Download PDF directly from modal
   - Print button in modal
   - Close button

4. **Export History** (Optional, nice-to-have)
   - Track recent exports
   - Re-download previous exports
   - Show export timestamps

---

## Technical Requirements

### Backend Dependencies
Ensure these are in `backend/requirements.txt`:
```txt
openpyxl>=3.1.0  # Excel generation
reportlab>=4.0.0  # PDF generation (or weasyprint)
# OR
weasyprint>=60.0  # Alternative PDF library (better HTML/CSS support)
qrcode>=7.4.0  # QR code generation (optional)
Pillow>=10.0.0  # Image processing for QR codes
```

### Frontend Dependencies
Already installed:
- `jspdf` - for client-side PDF (keep as fallback)
- `html2canvas` - for canvas rendering
- `canvas-confetti` - for celebration effect

### API Integration
- Use existing `API_BASE` from environment
- Follow existing error handling patterns
- Use same authentication/request structure as other endpoints

### Error Handling
- Handle large files (200+ guests) gracefully
- Show user-friendly error messages
- Log errors to `backend/logs/seatharmony_errors.log`
- Timeout handling for large exports (30+ seconds)

---

## Design Requirements

### Visual Consistency
- Match existing SeatHarmony design system:
  - Colors: Primary `#8A8E75`, Secondary `#D5C7AD`, Accent `#BEC5A4`
  - Fonts: Playfair Display (headings), Lato (body)
  - Border radius: `rounded-xl`, `rounded-2xl`
  - Shadows: `shadow-sm`, `shadow-md`
  - Dark mode support throughout

### User Experience
- **Loading States**: Show spinners/progress bars during export generation
- **Success Feedback**: Toast notifications or inline success messages
- **Error Feedback**: Clear error messages with retry options
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

### Responsive Design
- Mobile-friendly export buttons
- Print-optimized layouts
- Tablet-friendly preview modals

---

## File Structure Reference

```
backend/
├── api.py                    # Add export endpoints here
├── models.py                 # Add export request/response models
├── requirements.txt          # Add export libraries
└── logs/
    └── seatharmony_errors.log

frontend/
├── pages/
│   ├── Confirmation.tsx     # Enhance existing
│   └── ExportDashboard.tsx   # Enhance existing
├── src/
│   └── services/
│       └── api.ts           # Add export API functions
└── public/
    └── Template.xlsx         # Reference template (if exists)
```

---

## Implementation Checklist

### Backend (Priority Order)
- [ ] Add Excel export endpoint (`/api/export/excel`)
- [ ] Add PDF export endpoint (`/api/export/pdf`)
- [ ] Add shareable link endpoint (`/api/export/share`)
- [ ] Add export request/response models to `models.py`
- [ ] Install and configure export libraries
- [ ] Add error handling and logging
- [ ] Test with large guest lists (200+ guests)

### Frontend (Priority Order)
- [ ] Implement Excel download functionality in ExportDashboard
- [ ] Implement PDF download functionality in ExportDashboard
- [ ] Implement shareable link generation
- [ ] Make export settings checkboxes functional
- [ ] Add loading states for all export operations
- [ ] Enhance Confirmation page export buttons
- [ ] Add print optimization CSS
- [ ] Add error handling and user feedback
- [ ] Test all export flows end-to-end

---

## Testing Requirements

1. **Excel Export:**
   - Test with 50, 100, 200+ guests
   - Verify all sheets generate correctly
   - Check formatting (colors, borders, headers)
   - Test dietary restrictions column
   - Test vendor summary sheet

2. **PDF Export:**
   - Test high-resolution generation (300 DPI)
   - Verify floor plan renders correctly
   - Check table details pages
   - Test print layout
   - Verify file size is reasonable (< 10MB)

3. **Shareable Links:**
   - Test link generation
   - Test link expiration
   - Test accessing shared layout
   - Verify read-only access

4. **Error Cases:**
   - Network failures
   - Large file timeouts
   - Invalid data
   - Missing venue layout

---

## Additional Notes

- **Performance**: Excel/PDF generation should complete in < 10 seconds for 200 guests
- **File Naming**: Use format: `SeatHarmony_[Type]_[VenueName]_[YYYY-MM-DD].[ext]`
- **Caching**: Consider caching generated exports for shareable links
- **Security**: Validate all input data, sanitize file names
- **Logging**: Log all export operations for debugging

---

## Success Criteria

✅ Users can export seating plan to Excel with all requested data  
✅ Users can export high-resolution PDF floor plan  
✅ Users can generate and share view-only links to their layout  
✅ All export options respect user preferences  
✅ Exports work for large guest lists (200+)  
✅ Error handling is robust and user-friendly  
✅ Design matches existing SeatHarmony aesthetic  
✅ Dark mode is fully supported  

---

**Start with backend endpoints, then connect frontend. Test incrementally as you build each feature.**
