#!/usr/bin/env python3
"""
Flask API server for PDF extraction, merchant matching, and insights generation.
This runs as a separate service on Railway and is called by the Next.js frontend.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import tempfile
import subprocess
import base64
from pathlib import Path

app = Flask(__name__)

# Enable CORS for Next.js frontend (will be configured with specific origin in production)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000", "https://*.netlify.app"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Get the directory containing this script
BASE_DIR = Path(__file__).parent

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Railway"""
    return jsonify({
        'status': 'healthy',
        'service': 'finsight-api',
        'version': '1.0.0'
    })

@app.route('/api/extract', methods=['POST'])
def extract_pdf():
    """
    Extract transactions from uploaded PDF bank statements.

    Request body:
    {
        "files": [
            {
                "name": "statement.pdf",
                "data": "base64-encoded-pdf-content"
            }
        ]
    }

    Returns:
    {
        "results": [
            {
                "transactions": [...],
                "metadata": {...}
            }
        ]
    }
    """
    try:
        data = request.get_json()

        if not data or 'files' not in data:
            return jsonify({'error': 'No files provided'}), 400

        files = data['files']
        results = []

        for file_data in files:
            filename = file_data.get('name', 'statement.pdf')
            pdf_base64 = file_data.get('data')

            if not pdf_base64:
                return jsonify({'error': f'No data for file {filename}'}), 400

            # Decode base64 PDF
            pdf_bytes = base64.b64decode(pdf_base64)

            # Create temp files
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as pdf_temp:
                pdf_temp.write(pdf_bytes)
                pdf_path = pdf_temp.name

            with tempfile.NamedTemporaryFile(suffix='.json', delete=False) as json_temp:
                json_path = json_temp.name

            try:
                # Run extraction script
                extract_script = BASE_DIR / 'extract-pdfplumber.py'
                result = subprocess.run(
                    ['python3', str(extract_script), pdf_path, json_path, '--scrub'],
                    capture_output=True,
                    text=True,
                    timeout=60
                )

                if result.returncode != 0:
                    raise Exception(f'Extraction failed: {result.stderr}')

                # Read extracted data
                with open(json_path, 'r') as f:
                    extracted_data = json.load(f)

                # Build merchant dictionary
                dict_path = BASE_DIR / 'merchant_dictionary.json'
                build_dict_script = BASE_DIR / 'build_dictionary.py'

                subprocess.run(
                    ['python3', str(build_dict_script), json_path, str(dict_path)],
                    capture_output=True,
                    timeout=30
                )

                # Match merchants
                match_script = BASE_DIR / 'match_merchants.py'
                subprocess.run(
                    ['python3', str(match_script), json_path, json_path, str(dict_path)],
                    capture_output=True,
                    timeout=30
                )

                # Re-read matched data
                with open(json_path, 'r') as f:
                    matched_data = json.load(f)

                results.append(matched_data)

            finally:
                # Cleanup temp files
                try:
                    os.unlink(pdf_path)
                    os.unlink(json_path)
                except:
                    pass

        return jsonify({'results': results})

    except Exception as e:
        print(f'Error in extract_pdf: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/merge', methods=['POST'])
def merge_statements():
    """
    Merge multiple bank statements, removing duplicates.

    Request body:
    {
        "statements": [
            {"transactions": [...], ...},
            {"transactions": [...], ...}
        ]
    }

    Returns:
    {
        "merged": {
            "transactions": [...],
            "metadata": {...}
        }
    }
    """
    try:
        data = request.get_json()

        if not data or 'statements' not in data:
            return jsonify({'error': 'No statements provided'}), 400

        statements = data['statements']

        # Save statements to temp files
        temp_files = []
        for i, stmt in enumerate(statements):
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(stmt, f)
                temp_files.append(f.name)

        # Create output file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name

        try:
            # Run merge script
            merge_script = BASE_DIR / 'merge_statements.py'
            cmd = ['python3', str(merge_script)] + temp_files + ['--output', output_path]

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                raise Exception(f'Merge failed: {result.stderr}')

            # Read merged data
            with open(output_path, 'r') as f:
                merged_data = json.load(f)

            return jsonify({'merged': merged_data})

        finally:
            # Cleanup
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except:
                    pass
            try:
                os.unlink(output_path)
            except:
                pass

    except Exception as e:
        print(f'Error in merge_statements: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/insights', methods=['POST'])
def generate_insights():
    """
    Generate spending insights from merged transactions.

    Request body:
    {
        "transactions": [...],
        "metadata": {...}
    }

    Returns:
    {
        "insights": {
            "summary": {...},
            "top_merchants": [...],
            "recurring_charges": [...]
        }
    }
    """
    try:
        data = request.get_json()

        if not data or 'transactions' not in data:
            return jsonify({'error': 'No transactions provided'}), 400

        # Save to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(data, f)
            input_path = f.name

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name

        try:
            # Run insights script
            insights_script = BASE_DIR / 'generate_insights.py'
            result = subprocess.run(
                ['python3', str(insights_script), input_path, output_path],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                raise Exception(f'Insights generation failed: {result.stderr}')

            # Read insights
            with open(output_path, 'r') as f:
                insights_data = json.load(f)

            return jsonify({'insights': insights_data})

        finally:
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except:
                pass

    except Exception as e:
        print(f'Error in generate_insights: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/learn-merchant', methods=['POST'])
def learn_merchant():
    """
    Learn a merchant correction from user feedback.

    Request body:
    {
        "normalized_merchant": "mcdonalds",
        "canonical_name": "McDonald's",
        "category": "Dining"
    }

    Returns:
    {
        "success": true,
        "message": "Learned merchant mapping"
    }
    """
    try:
        data = request.get_json()

        required_fields = ['normalized_merchant', 'canonical_name', 'category']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400

        # Load existing dictionary
        dict_path = BASE_DIR / 'merchant_dictionary.json'

        if dict_path.exists():
            with open(dict_path, 'r') as f:
                dictionary = json.load(f)
        else:
            dictionary = {}

        # Add new merchant
        normalized = data['normalized_merchant']
        dictionary[normalized] = {
            'canonical_name': data['canonical_name'],
            'category': data['category'],
            'confidence': 'high'
        }

        # Save dictionary
        with open(dict_path, 'w') as f:
            json.dump(dictionary, f, indent=2)

        return jsonify({
            'success': True,
            'message': f'Learned merchant: {normalized} -> {data["canonical_name"]}'
        })

    except Exception as e:
        print(f'Error in learn_merchant: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/confidence', methods=['POST'])
def calculate_confidence():
    """
    Calculate confidence scores for merchant normalization.

    Request body:
    {
        "statement": {"transactions": [...], ...},
        "threshold": 60
    }

    Returns:
    {
        "transactions": [...with confidence scores...],
        "summary": {...}
    }
    """
    try:
        data = request.get_json()

        if not data or 'statement' not in data:
            return jsonify({'error': 'No statement provided'}), 400

        statement = data['statement']
        threshold = data.get('threshold', 60)

        # Save to temp file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(statement, f)
            input_path = f.name

        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_path = f.name

        try:
            # Run confidence calculation script
            confidence_script = BASE_DIR / 'calculate_confidence.py'
            result = subprocess.run(
                ['python3', str(confidence_script), input_path, '--output', output_path, '--threshold', str(threshold)],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                raise Exception(f'Confidence calculation failed: {result.stderr}')

            # Read scored data
            with open(output_path, 'r') as f:
                scored_data = json.load(f)

            return jsonify(scored_data)

        finally:
            try:
                os.unlink(input_path)
                os.unlink(output_path)
            except:
                pass

    except Exception as e:
        print(f'Error in calculate_confidence: {e}')
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Railway sets PORT environment variable
    port = int(os.environ.get('PORT', 8000))

    # In production, Railway handles HTTPS, so we bind to 0.0.0.0
    app.run(host='0.0.0.0', port=port, debug=False)
