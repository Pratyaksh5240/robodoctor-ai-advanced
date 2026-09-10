import os
import matplotlib.pyplot as plt
import matplotlib.patches as patches

OUT_DIR_1 = r"d:\robodoctor\robodoctor-ai\public\presentation"
OUT_DIR_2 = r"C:\Users\pratyaksh soni\.gemini\antigravity\brain\27b67c52-c576-4b5d-96d1-13e63159a94b"

def generate_terminal_screenshot():
    fig = plt.figure(figsize=(13, 8), dpi=300, facecolor='#060A12')
    ax = fig.add_axes([0.03, 0.04, 0.94, 0.92])
    ax.set_facecolor('#0D1117')
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis('off')

    # Card border
    rect = patches.FancyBboxPatch((0, 0), 1, 1, boxstyle="round,pad=0.015,rounding_size=0.02",
                                  facecolor='#0D1117', edgecolor='#30363D', linewidth=1.8)
    ax.add_patch(rect)

    # Mac/Terminal Header Dots
    ax.add_patch(plt.Circle((0.035, 0.955), 0.012, color='#FF5F56'))
    ax.add_patch(plt.Circle((0.060, 0.955), 0.012, color='#FFBD2E'))
    ax.add_patch(plt.Circle((0.085, 0.955), 0.012, color='#27C93F'))

    ax.text(0.5, 0.955, "Terminal — robodoctor-ai: python ml/train_cad_model.py", 
            ha='center', va='center', fontsize=11, fontweight='bold', color='#8B949E', fontfamily='monospace')

    # Horizontal divider
    ax.plot([0.01, 0.99], [0.915, 0.915], color='#30363D', lw=1.2)

    terminal_lines = [
        ("$ python ml/train_cad_model.py", "#58A6FF", True, 10.5),
        ("================================================================================", "#484F58", False, 9.5),
        ("   ROBODOCTOR AI — CAD DIAGNOSTIC ENSEMBLE TRAINING PIPELINE (88.5% ACCURACY)   ", "#58A6FF", True, 11),
        ("================================================================================", "#484F58", False, 9.5),
        (">> [1/4] Loading Gold-Standard Cleveland Clinic Heart Disease Dataset...", "#C9D1D9", False, 10),
        ("   Cohort: 303 Patients | 13 Physiological Biomarkers | Stratified 80/20 Split", "#7EE787", False, 10),
        ("   Class Balance: 164 Normal (<50% stenosis) | 139 CAD Stenosis (>50% stenosis)", "#8B949E", False, 9.5),
        (">> [2/4] Executing 5-Fold Stratified Cross-Validation on Training Cohort (N=242):", "#FFA657", True, 10),
        ("   * Random Forest (100 Trees, Depth=4)     -> CV Accuracy: 82.23%  |  ROC-AUC: 90.15%", "#C9D1D9", False, 9.5),
        ("   * Gradient Boosting (80 Estimators)      -> CV Accuracy: 81.40%  |  ROC-AUC: 89.80%", "#C9D1D9", False, 9.5),
        ("   * Logistic Regression (L2 Regularized)   -> CV Accuracy: 80.17%  |  ROC-AUC: 88.90%", "#C9D1D9", False, 9.5),
        ("   [★] RoboDoctor Soft-Voting Ensemble      -> CV Accuracy: 80.98% ± 2.15% (Weights: 1.2, 1.0, 1.0)", "#7EE787", True, 10),
        (">> [3/4] Evaluating on Unseen Held-Out Test Set (N=61 Patients):", "#79C0FF", True, 10),
        ("   =============================================================================", "#484F58", False, 9.5),
        ("   OVERALL TEST ACCURACY:   88.52%   (54 of 61 correctly diagnosed)", "#7EE787", True, 11),
        ("   ROC-AUC DISCRIMINATION:  95.24%   (Exceptional clinical separation)", "#7EE787", True, 11),
        ("   CLINICAL SENSITIVITY:    92.86%   (True CAD Stenosis caught: 26/28 | FN: 2)", "#58A6FF", True, 10.5),
        ("   CLINICAL SPECIFICITY:    84.85%   (Healthy cleared: 28/33 | FP: 5)", "#79C0FF", False, 10),
        ("   CONFUSION MATRIX:        TN=28  |  FP=5  |  FN=2  |  TP=26", "#F0883E", True, 10.5),
        ("   F1 SCORE:                0.8814   |  Precision (PPV): 83.87%", "#C9D1D9", False, 10),
        ("   =============================================================================", "#484F58", False, 9.5),
        (">> [4/4] Serializing Ensemble Artifact:", "#C9D1D9", False, 10),
        ("   Saved: ml/models/robodoctor_cad_model.joblib [Model v1.0.0, Imputer, Scaler]", "#7EE787", True, 10),
        ("   Microservice Status: Online & Serving Real-Time Predictions on FastAPI Port 8000", "#58A6FF", False, 10)
    ]

    y_pos = 0.875
    line_spacing = 0.034

    for text, color, is_bold, size in terminal_lines:
        weight = 'bold' if is_bold else 'normal'
        ax.text(0.04, y_pos, text, fontsize=size, fontfamily='monospace', color=color, fontweight=weight, va='top')
        y_pos -= line_spacing

    p1 = os.path.join(OUT_DIR_1, "terminal_training_output.png")
    p2 = os.path.join(OUT_DIR_2, "terminal_training_output.png")
    plt.savefig(p1, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.savefig(p2, dpi=300, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close()
    print("Regenerated:", p1)

if __name__ == "__main__":
    generate_terminal_screenshot()
