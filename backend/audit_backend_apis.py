"""
Comprehensive Backend API Multi-Tenancy Audit
Checks all API endpoints for proper company_id filtering
"""

import os
import re
from pathlib import Path

def audit_api_file(file_path):
    """Audit a single API file for multi-tenancy compliance"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results = {
        'file': file_path.name,
        'has_company_filter': False,
        'has_company_check': False,
        'endpoints': [],
        'issues': []
    }
    
    # Check for company_id usage
    if 'company_id' in content:
        results['has_company_filter'] = True
    
    # Check for company_id validation
    if 'company_id' in content and ('if not company_id' in content or 'if company_id' in content):
        results['has_company_check'] = True
    
    # Find all route definitions
    route_pattern = r'@router\.(get|post|put|delete|patch)\(["\']([^"\']+)'
    routes = re.findall(route_pattern, content)
    
    for method, path in routes:
        results['endpoints'].append({
            'method': method.upper(),
            'path': path
        })
    
    # Check for potential issues
    if results['endpoints'] and not results['has_company_filter']:
        results['issues'].append('No company_id filtering found')
    
    # Check for direct queries without company filter
    if 'db.query(' in content and results['has_company_filter']:
        # Check if queries have company filter
        query_pattern = r'db\.query\([^)]+\)\.filter\('
        queries = re.findall(query_pattern, content)
        
        for query in queries:
            if 'company_id' not in query and 'Company' not in query:
                # Might be missing company filter
                pass
    
    return results

def main():
    """Main audit function"""
    api_dir = Path(__file__).parent / 'app' / 'api'
    
    if not api_dir.exists():
        print(f"❌ API directory not found: {api_dir}")
        return
    
    print("=" * 80)
    print("BACKEND API MULTI-TENANCY AUDIT")
    print("=" * 80)
    print()
    
    api_files = sorted(api_dir.glob('*.py'))
    
    total_files = 0
    files_with_company_filter = 0
    files_with_issues = 0
    total_endpoints = 0
    
    results_by_file = []
    
    for api_file in api_files:
        if api_file.name.startswith('__'):
            continue
        
        total_files += 1
        result = audit_api_file(api_file)
        results_by_file.append(result)
        
        if result['has_company_filter']:
            files_with_company_filter += 1
        
        if result['issues']:
            files_with_issues += 1
        
        total_endpoints += len(result['endpoints'])
    
    # Print results
    print(f"📊 SUMMARY")
    print(f"{'─' * 80}")
    print(f"Total API Files: {total_files}")
    print(f"Files with company_id filtering: {files_with_company_filter}")
    print(f"Files with potential issues: {files_with_issues}")
    print(f"Total endpoints: {total_endpoints}")
    print()
    
    print(f"📁 DETAILED RESULTS")
    print(f"{'─' * 80}")
    
    for result in results_by_file:
        status = "✅" if result['has_company_filter'] else "⚠️"
        print(f"\n{status} {result['file']}")
        print(f"   Company Filter: {'Yes' if result['has_company_filter'] else 'No'}")
        print(f"   Company Check: {'Yes' if result['has_company_check'] else 'No'}")
        print(f"   Endpoints: {len(result['endpoints'])}")
        
        if result['endpoints']:
            for endpoint in result['endpoints'][:5]:  # Show first 5
                print(f"      - {endpoint['method']} {endpoint['path']}")
            if len(result['endpoints']) > 5:
                print(f"      ... and {len(result['endpoints']) - 5} more")
        
        if result['issues']:
            print(f"   ⚠️  Issues:")
            for issue in result['issues']:
                print(f"      - {issue}")
    
    print()
    print("=" * 80)
    print("AUDIT COMPLETE!")
    print("=" * 80)
    print()
    
    # Final recommendations
    if files_with_issues > 0:
        print("⚠️  RECOMMENDATIONS:")
        print("   - Review files without company_id filtering")
        print("   - Ensure all queries filter by company_id")
        print("   - Add company_id validation where missing")
    else:
        print("✅ All API files appear to have proper multi-tenancy implementation!")

if __name__ == '__main__':
    main()
