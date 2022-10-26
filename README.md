# Setup
conda create --name mkdocs
conda activate mkdocs
conda install python

pip install mkdocs
pip install mkdocs-material
pip install mkdocs-ezlinks-plugin
pip install mike
pip install mkdocs-mermaid2-plugin

or 

pip install -r ./requirements.txt

# Remove 
conda env remove -n mkdocs



export GH_TOKEN=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 && pip install git+https://${GH_TOKEN}@github.com/squidfunk/mkdocs-material-insiders.git
