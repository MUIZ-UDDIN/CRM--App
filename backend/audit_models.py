"""
Audit all SQLAlchemy models for company_id column
"""

import os
import re
from pathlib import Path

def audit_model_file(file_path):
    """Audit a single model file for company_id"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results = {
        'file': file_path.name,
        'models': [],
        'has_company_id': False
    }
    
    # Find all class definitions that inherit from BaseModel
    class_pattern = r'class\s+(\w+)\(.*BaseModel.*\):'
    classes = re.findall(class_pattern, content)
    
    for class_name in classes:
        # Check if this model has company_id
        # Look for the pattern: company_id = Column(...)
        model_section_pattern = rf'class\s+{class_name}\(.*?\):(.*?)(?=class\s+\w+|$)'
        model_match = re.search(model_section_pattern, content, re.DOTALL)
        
        if model_match:
            model_content = model_match.group(1)
            has_company_id = 'company_id' in model_content and 'Column' in model_content
            
            results['models'].append({
                'name': class_name,
                'has_company_id': has_company_id
            })
            
            if has_company_id:
                results['has_company_id'] = True
    
    return results

def main():
    """Main audit function"""
    models_dir = Path(__file__).parent / 'app' / 'models'
    
    if not models_dir.exists():
        print(f"❌ Models directory not found: {models_dir}")
        return
    
    print("=" * 80)
    print("BACKEND MODELS MULTI-TENANCY AUDIT")
    print("=" * 80)
    print()
    
    model_files = sorted(models_dir.glob('*.py'))
    
    total_files = 0
    total_models = 0
    models_with_company_id = 0
    models_without_company_id = 0
    
    results_by_file = []
    models_without = []
    
    for model_file in model_files:
        if model_file.name.startswith('__') or model_file.name == 'base.py':
            continue
        
        total_files += 1
        result = audit_model_file(model_file)
        results_by_file.append(result)
        
        for model in result['models']:
            total_models += 1
            if model['has_company_id']:
                models_with_company_id += 1
            else:
                models_without_company_id += 1
                models_without.append(f"{result['file']} -> {model['name']}")
    
    # Print summary
    print(f"📊 SUMMARY")
    print(f"{'─' * 80}")
    print(f"Total Model Files: {total_files}")
    print(f"Total Models: {total_models}")
    print(f"Models with company_id: {models_with_company_id}")
    print(f"Models without company_id: {models_without_company_id}")
    print()
    
    # Print detailed results
    print(f"📁 DETAILED RESULTS")
    print(f"{'─' * 80}")
    
    for result in results_by_file:
        if not result['models']:
            continue
        
        status = "✅" if result['has_company_id'] else "⚠️"
        print(f"\n{status} {result['file']}")
        
        for model in result['models']:
            model_status = "✅" if model['has_company_id'] else "❌"
            print(f"   {model_status} {model['name']}")
    
    # Print models without company_id
    if models_without:
        print()
        print(f"⚠️  MODELS WITHOUT company_id:")
        print(f"{'─' * 80}")
        for model in models_without:
            print(f"   ❌ {model}")
    
    print()
    print("=" * 80)
    print("AUDIT COMPLETE!")
    print("=" * 80)
    print()
    
    # Recommendations
    if models_without_company_id > 0:
        print("⚠️  RECOMMENDATIONS:")
        print("   - Review models without company_id")
        print("   - Add company_id to user-facing models")
        print("   - System models (User, Company, Role) don't need company_id")
    else:
        print("✅ All user-facing models have company_id!")

if __name__ == '__main__':
    main()
