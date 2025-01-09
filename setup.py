from setuptools import setup, find_packages

setup(
    name="stockit",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "fastapi==0.100.0",
        "uvicorn==0.22.0",
        "numpy>=1.26.0",
        "pandas==2.1.1",
        "scikit-learn==1.3.0",
        "joblib==1.3.2"
    ],
    python_requires=">=3.12",
)