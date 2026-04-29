"""MCP server package for driving MviewerStudio from AI clients.

The package intentionally stays separate from the Flask routes: MCP tools call
the existing backend HTTP API through `MviewerStudioClient`, so the same create,
preview, publish and style/template code paths are reused by humans and agents.
"""
