from os import path, mkdir, remove, walk
import logging
import xml.etree.ElementTree as ET
import re
import glob

from ..models.config import ConfigModel

from .git_utils import Git_manager

logger = logging.getLogger(__name__)  


'''
This class ease CRUD + versioning configs operations.
A register given by app.register is use as global configs metadata store.
DCAT-RDF Metadata are given by front end (see above ConfigModel).
'''
class Config:
    def __init__(self, data = "", user = "", app = None, xml = None) -> None:
        
        self.uuid = None
        self.full_xml_path = None
        self.app = app
        self.directory = None
        
        self.user = user
        if not xml:
            self.xml = self._read_xml_data(data)
        else:
            self.xml = self._read_xml(xml)
        if self.xml is not None and app.register:
            self.register = app.register

            # init or create workspace
            self.workspace = path.join(self.app.config["EXPORT_CONF_FOLDER"], self.uuid)
            # create or update workspace
            self.create_workspace()
            # init repo
            self.git = Git_manager(self.workspace, self.user)
            self.repo = self.git.repo
            # save xml and git commit
            self.create_or_update_config()
  
    def _read_xml(self, xml):
        '''
        :parameter xml: str XML config from request
        '''
        self.meta = self._get_xml_describe(xml)
        if self.meta.find(".//{*}identifier") is not None:
            self.uuid = self.meta.find(".//{*}identifier").text
        return xml

    def _read_xml_data(self, data):
        '''
        Decode request data body to XML.
        Then, will replace user info if exists.
        '''
        # read xml
        self.data = data.decode("utf-8")
        if not self.data:
            return None
        xml = self.data.replace("anonymous", self.user.username)
        return self._read_xml(xml)

    def create_workspace(self):
        '''
        Init or retrieve workspace
        '''
        if not path.exists(self.workspace):
            # create directory
            mkdir(self.workspace)
            mkdir(path.join(self.workspace, "preview"))
    
    def _get_xml_describe(self, xml):
        '''
        Return metadata from xml DCAT balises
        :parameter xml: str
        '''
        xml_parser = ET.fromstring(xml)
        return xml_parser.find(".//metadata/{*}RDF/{*}Description")
    
    def create_or_update_config(self):
        '''
        Create config workspace and save XML as file.
        Will init git file as version manager.
        '''
        # get meta info from XML
        if self.meta.find(".//{*}identifier"):
            self.uuid = self.meta.find(".//{*}identifier").text
        file_name = self.meta.find("{*}title").text
        # save file
        normalize_file_name = re.sub('[^a-zA-Z0-9  \n\.]', "_", file_name).replace(" ", "_")
        self.full_xml_path = path.join(self.workspace, "%s.xml" % normalize_file_name)
        
        # needed if we change config title to clean others XML
        # if the name is the same, git will just dectect unstaged changes        
        self.clean_all_workspace_configs()

        # write file
        with open(self.full_xml_path, "w") as file:
            file.write(self.xml)
            file.close()
        commit_msg = self.meta.find("{*}description").text
        if not commit_msg:
            commit_msg = "Creation : %s.xml " % normalize_file_name
        self.git.commit_changes(commit_msg)
    
    def clean_all_workspace_configs(self):
        '''
        Remove each XML found in app workspace
        '''
        for file in glob.glob("%s/*.xml" % self.workspace):
            remove(file)

    def as_data(self):
        '''
        Index config metadata in register.
        Use to search config by DCAT RDF metadata.
        '''
        subject = self.meta.find("{*}subject").text if self.meta.find("{*}subject") is not None else ""
        url = self.full_xml_path.replace(
            self.app.config["EXPORT_CONF_FOLDER"],
            "",
        )
        return ConfigModel(
            id = self.uuid,
            title = self.meta.find("{*}title").text,
            creator = self.meta.find("{*}creator").text,
            description = self.meta.find("{*}description").text,
            date = self.meta.find("{*}date").text,
            versions = self.git.get_versions(),
            keywords = self.meta.find("{*}keywords").text,
            url = url,
            subject = subject,
        )
    
    def as_dict(self):
        '''
        Get config as dict.
        '''
        return self.as_data().as_dict()